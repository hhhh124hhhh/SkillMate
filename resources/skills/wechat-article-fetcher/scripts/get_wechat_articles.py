from typing import Dict, Any, List
import requests
from pprint import pprint
import traceback
import sys

# Fix encoding issues on Windows
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

"""
微信公众号文章获取工具

功能：
1. 根据公众号昵称搜索获取fakeid
2. 根据fakeid获取公众号文章列表

注意：需要有效的cookie和token，请从微信公众号后台获取
"""

__session = requests.Session()
__headers = {
    "User-Agent": 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
}
__params = {
    "lang": "zh_CN",
    "f": "json",
}


def get_fakeid(nickname: str, begin: int = 0, count: int = 1) -> str | None:
    """
    根据公众号昵称获取fakeid

    Args:
        nickname: 公众号昵称
        begin: 开始位置，默认0
        count: 获取数量，默认1

    Returns:
        公众号的fakeid，如果未找到返回None

    Raises:
        Exception: 获取失败时抛出异常
    """
    search_url = "https://mp.weixin.qq.com/cgi-bin/searchbiz"

    params = {
        "action": "search_biz",
        "query": nickname,
        "begin": begin,
        "count": count,
        "ajax": "1",
    }
    __params.update(params)

    try:
        search_gzh_rsp = __session.get(search_url, headers=__headers, params=__params)
        rsp_list = search_gzh_rsp.json()["list"]

        if rsp_list:
            return rsp_list[0].get('fakeid')
        return None
    except Exception as e:
        raise Exception(f'获取公众号{nickname}的 fakeid 失败，e={traceback.format_exc()}')


def get_articles(nickname: str, fakeid: str, begin: int = 0, count: int = 1) -> List[str]:
    """
    获取公众号文章列表

    Args:
        nickname: 公众号昵称
        fakeid: 公众号fakeid
        begin: 开始位置，默认0
        count: 获取数量，默认1

    Returns:
        文章列表，格式为 ["标题: 链接", ...]

    Raises:
        Exception: 获取失败时抛出异常
    """
    art_url = "https://mp.weixin.qq.com/cgi-bin/appmsg"

    art_params = {
        "query": '',
        "begin": begin,
        "count": count,
        "type": 9,
        "action": 'list_ex',
        "fakeid": fakeid,
    }
    __params.update(art_params)

    try:
        rsp_data = __session.get(art_url, headers=__headers, params=__params)

        if rsp_data:
            msg_json = rsp_data.json()

            if 'app_msg_list' in msg_json.keys():
                result = [item.get('title') + ': ' + item.get('link') for item in msg_json.get('app_msg_list')]
                return result
        else:
            return []
    except Exception as e:
        raise Exception(f'获取公众号{nickname}的文章失败，e={traceback.format_exc()}')


def handler(args: Dict[str, Any]) -> Dict[str, Any]:
    """
    主处理函数

    Args:
        args: 包含以下字段的字典
            - cookie: 微信公众号后台cookie
            - token: 微信公众号后台token
            - nickname: 公众号昵称
            - begin: 开始位置，默认0
            - count: 获取数量，默认1

    Returns:
        包含文章列表的字典
        {
            "result": [
                {"title": "文章标题", "url": "文章链接"},
                ...
            ]
        }
    """
    cookie = args.get('cookie')
    token = args.get('token')
    nickname = args.get('nickname')
    begin = args.get('begin', 0)
    count = args.get('count', 1)

    # 验证必填参数
    if not all([cookie, token, nickname]):
        raise ValueError("缺少必填参数：cookie, token, nickname")

    __headers["Cookie"] = cookie
    __params["token"] = token

    # 获取fakeid
    fakeid = get_fakeid(nickname, begin, count)
    if not fakeid:
        raise ValueError(f"未找到公众号：{nickname}")

    # 获取文章列表
    article_data = get_articles(nickname, fakeid, begin=begin, count=count)

    # 格式化返回结果
    result = []
    for item in article_data:
        parts = item.split(": ", 1)
        if len(parts) == 2:
            result.append({
                "title": parts[0],
                "url": parts[1]
            })

    return {"result": result}

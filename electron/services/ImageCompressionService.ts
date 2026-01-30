import log from 'electron-log';

/**
 * 图片压缩结果接口
 */
export interface CompressionResult {
    success: boolean;
    compressedData?: string;  // 压缩后的 base64
    originalSize?: number;     // 原始大小（字节）
    compressedSize?: number;   // 压缩后大小（字节）
    compressionRatio?: number; // 压缩比 (0-1)
    error?: string;
}

/**
 * 图片压缩服务
 * 使用 Sharp 库压缩 base64 图片，减少文件大小和处理时间
 */
export class ImageCompressionService {
    private stats = {
        total: 0,
        compressed: 0,
        totalRatio: 0,
        totalTime: 0
    };

    /**
     * 压缩 base64 图片
     * @param base64Data data:image/xxx;base64,xxxxx 格式
     * @param maxSize 最大边长（默认 1920）
     * @param quality JPEG 质量（默认 0.85）
     */
    async compressImage(
        base64Data: string,
        maxSize: number = 1920,
        quality: number = 0.85
    ): Promise<CompressionResult> {
        const startTime = Date.now();
        this.stats.total++;

        try {
            // 1. 验证输入
            if (!base64Data || typeof base64Data !== 'string') {
                return {
                    success: false,
                    error: '无效的输入：base64 数据为空或不是字符串'
                };
            }

            // 2. 解析 base64
            const matches = base64Data.match(/^data:(image\/[a-zA-Z]+);base64,(.+)$/);
            if (!matches) {
                return {
                    success: false,
                    error: '无效的 base64 图片格式，应为 data:image/xxx;base64,xxxxx'
                };
            }

            // const mimeType = matches[1];  // 暂时不使用，保留用于未来扩展
            const buffer = Buffer.from(matches[2], 'base64');

            log.log('[ImageCompression] 🖼️ Processing image');
            log.log('[ImageCompression] 📏 Input size:', (buffer.length / 1024).toFixed(2), 'KB');

            // 3. 动态导入 sharp 模块
            const sharp = (await import('sharp')).default;

            // 4. 获取元数据
            const metadata = await sharp(buffer).metadata();
            const originalSize = buffer.length;

            log.log('[ImageCompression] 📐 Original dimensions:', metadata.width, 'x', metadata.height);

            // 4. 判断是否需要压缩
            const maxDimension = Math.max(metadata.width || 0, metadata.height || 0);
            if (maxDimension <= maxSize) {
                log.log('[ImageCompression] ✅ Image already small enough, skipping compression');
                return {
                    success: true,
                    compressedData: base64Data,
                    originalSize,
                    compressedSize: originalSize,
                    compressionRatio: 1.0
                };
            }

            // 5. 计算新尺寸（保持宽高比）
            let newWidth: number;
            let newHeight: number;
            if (metadata.width && metadata.height) {
                if (metadata.width > metadata.height) {
                    newWidth = maxSize;
                    newHeight = Math.round((metadata.height * maxSize) / metadata.width);
                } else {
                    newHeight = maxSize;
                    newWidth = Math.round((metadata.width * maxSize) / metadata.height);
                }
            } else {
                newWidth = maxSize;
                newHeight = maxSize;
            }

            log.log('[ImageCompression] ✂️ Resizing to:', newWidth, 'x', newHeight);

            // 6. 执行压缩
            const compressedBuffer = await sharp(buffer)
                .resize(newWidth, newHeight, {
                    fit: 'inside',
                    withoutEnlargement: true
                })
                .jpeg({ quality })
                .toBuffer();

            const compressedSize = compressedBuffer.length;
            const compressionRatio = compressedSize / originalSize;

            // 7. 转换回 base64
            const compressedBase64 = `data:image/jpeg;base64,${compressedBuffer.toString('base64')}`;

            // 8. 更新统计信息
            this.stats.compressed++;
            this.stats.totalRatio += compressionRatio;
            const compressionTime = Date.now() - startTime;
            this.stats.totalTime += compressionTime;

            log.log('[ImageCompression] ✅ Compression successful');
            log.log('[ImageCompression] 📉 Size reduced from',
                (originalSize / 1024).toFixed(2), 'KB to',
                (compressedSize / 1024).toFixed(2), 'KB',
                `(${(compressionRatio * 100).toFixed(1)}%)`);
            log.log('[ImageCompression] ⏱️ Compression time:', compressionTime, 'ms');

            return {
                success: true,
                compressedData: compressedBase64,
                originalSize,
                compressedSize,
                compressionRatio
            };

        } catch (error) {
            const errorMessage = (error as Error).message;
            log.error('[ImageCompression] ❌ Compression failed:', errorMessage);
            log.error('[ImageCompression] 📊 Stack:', (error as Error).stack);

            return {
                success: false,
                error: `图片压缩失败: ${errorMessage}`
            };
        }
    }

    /**
     * 获取统计信息
     */
    getStats() {
        return {
            ...this.stats,
            avgRatio: this.stats.compressed > 0
                ? this.stats.totalRatio / this.stats.compressed
                : 0,
            avgTime: this.stats.total > 0
                ? this.stats.totalTime / this.stats.total
                : 0
        };
    }

    /**
     * 重置统计信息
     */
    resetStats() {
        this.stats = {
            total: 0,
            compressed: 0,
            totalRatio: 0,
            totalTime: 0
        };
    }
}

import { minify } from 'html-minifier-terser';

export default function htmlMinifyPlugin() {
  return {
    name: 'html-minify',
    enforce: 'post',
    async generateBundle(options, bundle) {
      for (const [fileName, asset] of Object.entries(bundle)) {
        if (fileName.endsWith('.html') && asset.type === 'asset' && typeof asset.source === 'string') {
          try {
            asset.source = await minify(asset.source, {
              collapseWhitespace: true,
              removeComments: true,
              minifyCSS: true,
              minifyJS: true,
              ignoreCustomFragments: [/<pre[\s\S]*?<\/pre>/]
            });
          } catch (e) {
            console.error('Error minifying', fileName, e);
          }
        }
      }
    }
  }
}

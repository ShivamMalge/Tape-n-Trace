import type { NextConfig } from 'next'

const config: NextConfig = {
  // The standalone editor folded into the classroom board and the exercises
  // (2026-08-31); its old addresses still resolve.
  async redirects() {
    return [
      { source: '/edit', destination: '/board', permanent: true },
      { source: '/edit/:machine((?!pda$|tm$).*)', destination: '/simulate/:machine', permanent: true },
    ]
  },
  // The engine and the UI package ship as TypeScript source and are compiled by
  // the app. One toolchain, no build step between editing a renderer and seeing it.
  transpilePackages: ['@tape-n-trace/engine', '@tape-n-trace/ui'],
  reactStrictMode: true,

  webpack: (webpackConfig) => {
    /**
     * The engine's internal imports carry `.js` extensions — `./result.js` for
     * `result.ts` — because that is what real Node ESM needs once the package is
     * compiled to `dist`, and the CLI and the notebook bundle will both consume
     * it that way.
     *
     * Vite substitutes the extension automatically, so vitest never noticed.
     * Webpack does not, and fails to resolve every internal import. This teaches
     * it the same substitution rather than stripping the extensions from source
     * and breaking the compiled output later.
     */
    webpackConfig.resolve.extensionAlias = {
      '.js': ['.ts', '.tsx', '.js'],
      '.jsx': ['.tsx', '.jsx'],
    }
    return webpackConfig
  },
}

export default config

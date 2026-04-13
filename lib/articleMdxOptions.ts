/**
 * Shared MDX options for article rendering (SSR + /api/article).
 * remark-math + rehype-katex: LaTeX must be parsed before MDX treats `{` in `\frac{...}` etc. as JSX expressions.
 */
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import rehypeUnwrapImages from 'rehype-unwrap-images'
import rehypeUnwrapFigures from '@/lib/rehypeUnwrapFigures'

export const articleMdxOptions = {
  remarkPlugins: [remarkGfm, remarkMath],
  rehypePlugins: [rehypeKatex, rehypeUnwrapImages, rehypeUnwrapFigures],
}

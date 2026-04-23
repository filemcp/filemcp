import { Injectable } from '@nestjs/common'
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkRehype from 'remark-rehype'
import rehypeSanitize from 'rehype-sanitize'
import rehypeHighlight from 'rehype-highlight'
import rehypeStringify from 'rehype-stringify'

const processor = unified()
  .use(remarkParse)
  .use(remarkRehype)
  .use(rehypeSanitize)
  .use(rehypeHighlight)
  .use(rehypeStringify)

@Injectable()
export class RenderService {
  async markdownToHtml(markdown: string): Promise<string> {
    const file = await processor.process(markdown)
    return String(file)
  }
}

import { NotFoundMessage } from '@/components/NotFoundMessage';

/**
 * Shell pages that call notFound() (an unknown certification or student): the message sits in
 * the shell's own <main>, next to the sidebar, so the page keeps one main landmark and the
 * viewport's height.
 */
export default function ShellNotFound() {
  return <NotFoundMessage />;
}

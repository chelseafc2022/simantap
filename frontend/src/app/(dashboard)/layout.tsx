import { BaseLayout } from "@/components/layouts/base-layout"

export default function Layout({
  children,
}: {
  children: React.ReactNode
}) {
  return <BaseLayout>{children}</BaseLayout>
}

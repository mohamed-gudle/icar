import { TestRunner } from "./components/TestRunner";
import { InvalidTokenScreen } from "./components/InvalidTokenScreen";

export const dynamic = "force-dynamic";

export default async function TestPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  if (!token) {
    return (
      <InvalidTokenScreen
        title="No test link"
        message="This page requires a valid invitation link. Please use the link from your email."
      />
    );
  }
  return <TestRunner token={token} />;
}

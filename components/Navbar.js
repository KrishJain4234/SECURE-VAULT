import Link from 'next/link';

export default function Navbar() {
  return (
    <nav>
      <Link href="/">Home</Link>
      <Link href="/gov">Government</Link>
      <Link href="/verify">Verify</Link>
    </nav>
  );
}
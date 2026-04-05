import Head from 'next/head';
import Link from 'next/link';
import styles from '../styles/globals.css';

export default function Home() {
  return (
    <div className="container">
      <Head>
        <title>eVault - Secure Document Storage</title>
        <meta name="description" content="Secure document storage using blockchain and IPFS" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="main">
        <h1 className="title">Welcome to eVault</h1>
        <p className="description">
          Secure your documents with blockchain technology and IPFS storage.
        </p>

        <div className="grid">
          <Link href="/gov" className="card">
            <h2>Government Upload &rarr;</h2>
            <p>Upload official documents for verification.</p>
          </Link>

          <Link href="/verify" className="card">
            <h2>Verify Document &rarr;</h2>
            <p>Verify the authenticity of a document.</p>
          </Link>
        </div>
      </main>
    </div>
  );
}
import { Helmet } from 'react-helmet-async';

interface SEOProps {
  title: string;
  description: string;
  image?: string;
  url?: string;
  noindex?: boolean;
}

export default function SEO({ title, description, image, url, noindex }: SEOProps) {
  const fullTitle = title.includes('AgriPulse') ? title : `${title} | AgriPulse`;
  const ogImage = image || 'https://agripulse.me/og-image.png';
  const canonicalUrl = url || (typeof window !== 'undefined' ? window.location.href : 'https://agripulse.me');

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonicalUrl} />
      {noindex && <meta name="robots" content="noindex, nofollow" />}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:url" content={canonicalUrl} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />
    </Helmet>
  );
}

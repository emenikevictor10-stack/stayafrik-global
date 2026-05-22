import { Helmet } from "react-helmet-async";
import { useLocation } from "react-router-dom";

const SITE = "https://stayglobal.app";

type Props = {
  title: string;
  description: string;
  image?: string;
  type?: "website" | "article" | "product";
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
  noindex?: boolean;
};

export const Seo = ({ title, description, image, type = "website", jsonLd, noindex }: Props) => {
  const { pathname } = useLocation();
  const url = `${SITE}${pathname}`;
  const jsonLdArr = jsonLd ? (Array.isArray(jsonLd) ? jsonLd : [jsonLd]) : [];

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />
      {noindex && <meta name="robots" content="noindex,nofollow" />}
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta property="og:type" content={type} />
      {image && <meta property="og:image" content={image} />}
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      {image && <meta name="twitter:image" content={image} />}
      {jsonLdArr.map((j, i) => (
        <script key={i} type="application/ld+json">{JSON.stringify(j)}</script>
      ))}
    </Helmet>
  );
};

/**
 * Balise de gabarit sans effet : elle sert uniquement à ce que les éditeurs
 * colorent la syntaxe GROQ. next-sanity la fournissait ; elle tient en trois
 * lignes et n'a aucune raison de coûter une dépendance React.
 */
const groq = (strings: TemplateStringsArray, ...values: unknown[]): string =>
  strings.reduce((acc, str, i) => acc + str + (i < values.length ? String(values[i]) : ''), '')

/**
 * Le filtre publishedAt <= now() est ce qui fait le calendrier éditorial :
 * un article publié dans le Studio avec une date future existe en base mais
 * n'apparaît nulle part sur le site tant que l'heure n'est pas passée.
 */
const PUBLISHED = `_type == "post" && defined(slug.current) && publishedAt <= now()`

const CARD_FIELDS = `
  _id,
  title,
  "slug": slug.current,
  excerpt,
  publishedAt,
  featured,
  coverImage,
  "author": author->{name, role, avatar},
  "categories": categories[]->{title, "slug": slug.current}
`

export const POSTS_QUERY = groq`*[${PUBLISHED}] | order(featured desc, publishedAt desc) {${CARD_FIELDS}}`

export const POST_QUERY = groq`*[${PUBLISHED} && slug.current == $slug][0]{
  ${CARD_FIELDS},
  body,
  metaTitle,
  metaDescription,
  noIndex,
  "related": *[${PUBLISHED} && _id != ^._id && count(categories[@._ref in ^.^.categories[]._ref]) > 0]
    | order(publishedAt desc)[0...3]{${CARD_FIELDS}}
}`

export const POST_SLUGS_QUERY = groq`*[${PUBLISHED}]{"slug": slug.current, publishedAt}`

export const CATEGORY_QUERY = groq`{
  "category": *[_type == "category" && slug.current == $slug][0]{title, description, "slug": slug.current},
  "posts": *[${PUBLISHED} && $slug in categories[]->slug.current] | order(publishedAt desc) {${CARD_FIELDS}}
}`

export const CATEGORY_SLUGS_QUERY = groq`*[_type == "category" && defined(slug.current)]{"slug": slug.current}`

export type PostCard = {
  _id: string
  title: string
  slug: string
  excerpt: string
  publishedAt: string
  featured?: boolean
  coverImage: { alt?: string } & Record<string, unknown>
  author: { name: string; role?: string; avatar?: Record<string, unknown> } | null
  categories: { title: string; slug: string }[] | null
}

export type Post = PostCard & {
  body: unknown[]
  metaTitle?: string
  metaDescription?: string
  noIndex?: boolean
  related: PostCard[]
}

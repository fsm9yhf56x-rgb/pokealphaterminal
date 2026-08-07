// src/app/robots.ts
//
// Ce qui est interdit ne l'est pas par pudeur : ce sont des pages sans contenu
// propre (personnelles, dupliquees pour chaque visiteur) ou internes. Les
// laisser explorer gaspille le budget d'exploration que Google alloue au site,
// au detriment des 46 000 pages qui, elles, ont quelque chose a dire.
//
// Note : Disallow n'est PAS une protection. Une page sensible se protege par
// l'authentification, pas par un fichier que tout le monde peut lire.

import type { MetadataRoute } from 'next'
import { SITE } from '@/lib/seo/sitemap-data'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/admin',
          '/dev-ui',
          '/scan-test',
          '/login',
          '/signup',
          '/forgot-password',
          '/reset-password',
          '/parametres',
          '/abonnement',
          '/parrainage',
          '/portfolio',
        ],
      },
      // Robots de RECHERCHE des assistants IA. Ils sont deja couverts par la
      // regle * ci-dessus ; on les nomme pour que la decision soit lisible et
      // qu'un blocage large ajoute plus tard ne les emporte pas par accident.
      // Bloquer OAI-SearchBot retire le site des reponses ChatGPT — c'est le
      // seul de la liste dont l'absence coute une visibilite.
      { userAgent: 'OAI-SearchBot', allow: '/' },
      { userAgent: 'ChatGPT-User', allow: '/' },
      { userAgent: 'Claude-SearchBot', allow: '/' },
      { userAgent: 'PerplexityBot', allow: '/' },
    ],
    sitemap: `${SITE}/sitemap.xml`,
    host: SITE,
  }
}

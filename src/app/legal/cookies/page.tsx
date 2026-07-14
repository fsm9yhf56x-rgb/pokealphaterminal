import type { Metadata } from 'next'
import PublicDoc from '@/components/layout/PublicDoc'
import CookieSettingsLink from '@/components/layout/CookieSettingsLink'

export const metadata: Metadata = { title: 'Politique de cookies — Kodo Cards', description: 'Politique de cookies de Kodo Cards.' }

export default function Page() {
  return (
    <PublicDoc title="Politique de cookies" updated="13/07/2026">
      <style>{`
        .ck-table{width:100%;border-collapse:collapse;margin:0 0 16px;font-size:13.5px;}
        .ck-table th,.ck-table td{border:1px solid #E5E5EA;padding:9px 11px;text-align:left;vertical-align:top;line-height:1.5;}
        .ck-table th{background:#F5F5F7;font-weight:700;color:#1D1D1F;font-size:12px;letter-spacing:.01em;}
        .ck-none{font-size:14px;color:#6E6E73;font-style:italic;margin:0 0 16px;}
        .ck-cat{font-weight:700;color:#1D1D1F;}
      `}</style>

      <p>La présente politique de cookies a pour but de vous informer de manière transparente sur la manière dont KodoCards utilise les cookies et technologies similaires sur le site.</p>

      <h2>1. Qu’est-ce qu’un cookie</h2>
      <p>Un cookie est un petit fichier texte déposé et stocké sur votre terminal (ordinateur, tablette, smartphone) lors de la consultation d'un site internet. Il permet à son émetteur d'identifier le terminal dans lequel il est enregistré, pendant la durée de validité ou d'enregistrement du cookie.</p>

      <h2>2. Quels types de cookies utilisons-nous et pourquoi ?</h2>

      <p><span className="ck-cat">Cookies nécessaires :</span> Ces cookies sont indispensables au bon fonctionnement site internet. Si vous refusez l’enregistrement de ces cookies dans votre terminal ou votre navigateur, ou si vous supprimez ceux qui y sont enregistrés, votre expérience sur le site internet peut être limitée.</p>
      <table className="ck-table">
        <thead>
          <tr><th>Nom du cookie</th><th>Délai de validité</th><th>Fournisseur</th><th>Finalités</th></tr>
        </thead>
        <tbody>
          <tr>
            <td>better-auth.session_token (préfixé __Secure- en production)</td>
            <td>Durée de la session (par défaut 7 jours)</td>
            <td>KodoCards</td>
            <td>Authentification et maintien de votre session de connexion.</td>
          </tr>
          <tr>
            <td>kodo_cookie_consent</td>
            <td>6 mois</td>
            <td>KodoCards</td>
            <td>Mémoriser vos choix de consentement aux cookies.</td>
          </tr>
        </tbody>
      </table>

      <p><span className="ck-cat">Cookies statistiques :</span> Ils sont utilisés pour comprendre comment les visiteurs interagissent avec le site web. Ces cookies aident à fournir des informations sur le nombre de visiteurs, le taux de rebond, la source de trafic, etc.</p>
      <table className="ck-table">
        <thead>
          <tr><th>Nom</th><th>Délai de validité</th><th>Fournisseur</th><th>Finalités</th></tr>
        </thead>
        <tbody>
          <tr>
            <td>kodo_anon (stockage local)</td>
            <td>6 mois</td>
            <td>KodoCards</td>
            <td>Identifiant anonyme de mesure d’audience, déposé uniquement pour les visiteurs non connectés ayant consenti aux cookies statistiques.</td>
          </tr>
          <tr>
            <td>kodo_sid (stockage de session)</td>
            <td>Session de navigation</td>
            <td>KodoCards</td>
            <td>Regrouper les pages vues au sein d’une même session pour la mesure d’audience.</td>
          </tr>
        </tbody>
      </table>
      <p className="ck-none">Ces identifiants ne sont déposés que si vous avez accepté les cookies statistiques. Pour les utilisateurs connectés, la mesure d’audience s’appuie sur le compte utilisateur (voir notre <a href="/legal/confidentialite">politique de confidentialité</a>).</p>

      <p><span className="ck-cat">Cookies marketings :</span> Ils permettent de vous proposer des publicités personnalisées.</p>
      <p className="ck-none">À ce jour, KodoCards n’utilise aucun cookie de cette catégorie.</p>

      <p><span className="ck-cat">Cookies fonctionnels :</span> ils permettent d’améliorer et de personnaliser l’expérience de l’utilisateur en mémorisant les préférences et les choix de utilisateurs.</p>
      <p className="ck-none">À ce jour, KodoCards n’utilise aucun cookie de cette catégorie.</p>

      <p><span className="ck-cat">Cookies de réseaux sociaux :</span> ils permettent le partage de contenus de notre site internet avec d’autres personnes, ou de faire connaitre votre consultation ou votre opinion concernant un contenu de notre site internet.</p>
      <p className="ck-none">À ce jour, KodoCards n’utilise aucun cookie de cette catégorie.</p>

      <h2>3. Comment gérer vos choix et votre consentement ?</h2>
      <p>Le dépôt des cookies nécessite votre consentement préalable. Ce consentement vous est demandé à travers le bandeau qui s’affiche lors de votre première navigation sur le site internet. Vous pouvez choisir d’accepter le dépôt des cookies, les refuser ou personnaliser votre choix. Vous pouvez retirer votre consentement à tout moment. Le refus des cookies n’entraîne aucune restriction d’accès à notre site (à l’exception des cookies strictement nécessaires).</p>

      <h2>Via notre panneau de gestion des cookies</h2>
      <p>Vous pouvez révoquer votre consentement ou modifier vos préférences à tout moment via le bouton ci-dessous :</p>
      <p><CookieSettingsLink label="Gérer mes préférences cookies" style={{ display: 'inline-block', background: '#1D1D1F', color: '#fff', padding: '10px 18px', borderRadius: 999, fontWeight: 600, fontSize: 14, textDecoration: 'none', fontFamily: "var(--font-sora, 'Sora', sans-serif)" }} /></p>

      <h2>Via votre navigateur</h2>
      <p>Vous avez le choix de configurer votre navigateur pour accepter ou refuser tous les cookies ou supprimer les cookies des paramètres de votre navigateur. La désactivation des cookies peut affecter la fonctionnalité de ce site et de nombreux autres sites Web que vous visitez.</p>
      <p>Pour paramétrer le navigateur Internet :</p>
      <ul>
        <li>Sous Edge / Internet Explorer : <a href="https://support.microsoft.com/fr-fr/topic/supprimer-et-g%C3%A9rer-les-cookies-168dab11-0753-043d-7c16-ede5947fc64d" target="_blank" rel="noopener noreferrer">support.microsoft.com</a></li>
        <li>Sous Firefox : <a href="https://support.mozilla.org/fr/kb/empecher-sites-enregistrer-preferences" target="_blank" rel="noopener noreferrer">support.mozilla.org</a></li>
        <li>Sous Chrome : <a href="https://support.google.com/chrome/answer/95647" target="_blank" rel="noopener noreferrer">support.google.com</a></li>
        <li>Sous Safari : <a href="https://support.apple.com/fr-fr/guide/safari/sfri11471/mac" target="_blank" rel="noopener noreferrer">support.apple.com</a></li>
      </ul>
      <p>Si vous voulez restreindre l’utilisation des cookies pour un autre navigateur ou sur un périphérique mobile, rendez-vous sur la page Web officielle du navigateur ou du fabricant du périphérique.</p>
    </PublicDoc>
  )
}

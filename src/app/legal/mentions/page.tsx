import type { Metadata } from 'next'
import PublicDoc from '@/components/layout/PublicDoc'

export const metadata: Metadata = { title: 'Mentions légales — Kodo Cards', description: 'Mentions légales de Kodo Cards.' }

export default function Page() {
  return (
    <PublicDoc title="Mentions légales" updated="13/07/2026">
      <h2>I.   Édition du site</h2>
      <p>Conformément à l’article 6 de la loi n° 2004-575 du 21 juin 2004 pour la confiance dans l’économie numérique (LCEN), il est précisé aux utilisateurs du site <a href="https://kodocards.com/" target="_blank" rel="noopener noreferrer">https://kodocards.com/</a> l’identité des intervenants dans le cadre de sa réalisation et de son suivi.</p>
      <p>Propriétaire du site : KodoCards, société par actions simplifiée en cours d’immatriculation.</p>
      <p>Siège social : 110 Cours Lieutaud, 13006, Marseille.</p>
      <p>Identifiant : Société en cours d’immatriculation au Registre du commerce et des sociétés de Marseille.</p>
      <p>Capital social : 200,00 €.</p>
      <p>Contact : <a href="mailto:contact@kodocards.com">contact@kodocards.com</a></p>
      <h2>II. Identité du directeur de la publication :</h2>
      <ul>
        <li>Directeur de la publication : Hoffmann Jürgen</li>
        <li>Fonction dans la société : Co-fondateur de KodoCards</li>
      </ul>
      <h2>III. Identité de l'hébergeur</h2>
      <p>Le site web de KodoCards est hébergé par l’entité suivante :</p>
      <p>Hébergeur : OVH SAS, Société par actions simplifiée Adresse : 2 rue Kellermann, 59100 Roubaix, France Contact : <a href="https://www.ovhcloud.com" target="_blank" rel="noopener noreferrer">https://www.ovhcloud.com</a></p>
      <h2>IV. Propriété intellectuelle</h2>
      <p>L’éditeur est propriétaire ou titulaire des droits d’usage sur tous les éléments du site.</p>
      <p>Contenu KodoCards : Toute reproduction, représentation ou adaptation de tout ou partie des éléments du site (textes, logos, algorithmes de l’IA KodoCards) est interdite sans autorisation préalable.</p>
      <p>Marques tierces : "Pokémon" et les visuels associés sont la propriété exclusive de The Pokémon Company, Nintendo, Creatures et Game Freak. KodoCards est un outil indépendant et n'entretient aucun lien d'affiliation, de partenariat ou de parrainage avec ces entités.</p>
      <h2>V. Limitation de responsabilité</h2>
      <p>L'éditeur fournit le contenu du site dans son état actuel sans aucune garantie quant à son exactitude.</p>
      <p>Données d’agrégation : KodoCards agrège des données issues de plateformes tierces (Cardmarket, eBay, etc.). L'éditeur ne saurait être tenu responsable des erreurs, omissions ou délais de mise à jour des prix affichés.</p>
      <p>Décisions financières : KodoCards n'est pas un conseiller financier. Les données, outils de portfolio et analyses ne constituent en aucun cas des conseils en investissement. L'utilisateur est seul responsable de ses décisions d'achat, de vente et des risques financiers (perte de capital) encourus.</p>
      <p>Intelligence Artificielle : Les analyses et suggestions générées par l'IA sont des résultats algorithmiques fournis à titre indicatif. L'éditeur ne garantit pas la fiabilité absolue des prédictions de l'IA.</p>
      <p>Liens externes : L'éditeur n'est pas responsable des fichiers ou contenus de tiers manifestement liés à ce site web via des liens hypertextes.</p>
      <h2>VI. Protection des données personnelles (RGPD)</h2>
      <p>Le traitement des données est effectué conformément au Règlement Général sur la Protection des Données (RGPD).</p>
      <p>Responsable du traitement : KodoCards SAS</p>
      <p>Pour plus d'informations, consultez notre [lien vers la Politique de Confidentialité].</p>
    </PublicDoc>
  )
}

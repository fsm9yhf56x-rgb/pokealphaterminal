import type { Metadata } from 'next'
import PublicDoc from '@/components/layout/PublicDoc'

export const metadata: Metadata = { title: 'Confidentialité — Kodo Cards', description: 'Politique de confidentialité de Kodo Cards.' }

export default function Page() {
  return (
    <PublicDoc title="Politique de confidentialité" updated="13/07/2026">
      <p>La présente politique de confidentialité définit et vous informe sur les modalités selon lesquelles KodoCards traite vos données conformément au Règlement (UE) 2016/679 du 27 avril 2016 relatif à la protection des personnes physiques à l'égard du traitement des données à caractère personnel et à la libre circulation de ces données (ci-après le « RGPD »).</p>
      <h2>1. Responsable du traitement des données</h2>
      <p>Le responsable de traitement est KodoCards, SAS, en cours d’immatriculation au RCS de Marseille, dont le siège social est situé au 110 Cours Lieutaud, 13006 Marseille.</p>
      <h2>2. Données collectées</h2>
      <p>Une donnée à caractère personnel est une donnée qui permet d’identifier un individu directement ou indirectement à partir d’une donnée ou d’un croisement de données.</p>
      <ul>
        <li>Donnée d’identification : Nom, prénom, adresse mail, numéro de téléphone</li>
        <li>Données économiques et financières : Les données de paiement sont traitées par notre prestataire de paiement Stripe. KodoCards ne conserve pas le numéro complet de carte bancaire. KodoCards peut conserver des informations relatives au statut du paiement, à l’abonnement, aux factures, aux identifiants de transaction et, le cas échéant, aux informations partielles nécessaires à la gestion de la relation client.</li>
      </ul>
      <p>Les données obligatoires sont indiquées lorsque vous nous fournissez vos données. Elles sont signalées par un astérisque et sont nécessaires pour vous fournir nos services.</p>
      <h2>3. Finalités du traitement et durées de conservation</h2>
      <style>{`
        .pc-table{width:100%;border-collapse:collapse;margin:0 0 16px;font-size:14px;}
        .pc-table th,.pc-table td{border:1px solid #E5E5EA;padding:10px 12px;text-align:left;vertical-align:top;line-height:1.5;}
        .pc-table th{background:#F5F5F7;font-weight:700;color:#1D1D1F;font-size:12.5px;letter-spacing:.01em;}
      `}</style>
      <table className="pc-table">
        <thead>
          <tr><th>Finalités</th><th>Bases légales</th><th>Durées de conservation</th></tr>
        </thead>
        <tbody>
          <tr>
            <td>Fournir nos services disponibles sur notre site via votre compte</td>
            <td>Exécution du contrat</td>
            <td>Vos données sont conservées pendant toute la durée de votre compte. En cas de compte inactifs pendant 2 ans, vos données personnelles seront supprimées en l’absence de réponse de votre part à notre mail de réactivation</td>
          </tr>
          <tr>
            <td>Adresse des newsletters</td>
            <td>Intérêt légitime</td>
            <td>Les données sont conservées pendant 3 ans à compter de votre dernier contact</td>
          </tr>
          <tr>
            <td>Répondre à vos demandes d’informations et de support</td>
            <td>Intérêt légitime</td>
            <td>Les données sont conservées pendant le temps nécessaire au traitement de votre demande et supprimés une fois la demande traitée</td>
          </tr>
          <tr>
            <td>Gérer les demandes d’exercice de droits</td>
            <td>Obligation légale</td>
            <td>Si nous vous demandons un justificatif d’identité : nous le conservons seulement pendant le temps nécessaire à la vérification d’identité. Une fois la vérification effectuée, le justificatif est supprimé. La trace de votre demande d’exercice de droit est conservée pendant 5 ans.</td>
          </tr>
        </tbody>
      </table>
      <h2>4. Destinataires des données</h2>
      <p>Les données personnelles peuvent être accessibles, dans la limite de leurs missions respectives, aux destinataires suivants :</p>
      <ul>
        <li>les personnes habilitées au sein de KodoCards ;</li>
        <li>l’hébergeur du site et de l’infrastructure technique, notamment OVH ;</li>
        <li>le prestataire de paiement, notamment Stripe ;</li>
        <li>les prestataires d’emailing ou de newsletter, notamment Brevo et/ou Substack selon les outils utilisés ;</li>
        <li>les prestataires techniques nécessaires au fonctionnement du service ;</li>
        <li>les conseils de KodoCards, notamment expert-comptable, avocat ou prestataires administratifs, lorsque cela est nécessaire ;</li>
        <li>les autorités administratives ou judiciaires, lorsque la loi l’exige.</li>
      </ul>
      <h2>5. Transfert de données personnelles</h2>
      <p>KodoCards privilégie, lorsque cela est possible, des prestataires traitant les données au sein de l’Union européenne ou de l’Espace économique européen. Toutefois, certains prestataires techniques utilisés par KodoCards peuvent être établis en dehors de l’Union européenne ou recourir à des sous-traitants situés dans des pays tiers.</p>
      <p>Lorsque des données personnelles sont transférées en dehors de l’Union européenne ou de l’Espace économique européen, KodoCards veille à ce que ces transferts soient encadrés par des garanties appropriées conformément au RGPD, notamment une décision d’adéquation de la Commission européenne, des clauses contractuelles types ou tout autre mécanisme reconnu par la réglementation applicable.</p>
      <h2>6. Vos droits concernant vos données</h2>
      <p>Vous disposez des droits suivants s’agissant de vos données personnelles :</p>
      <ul>
        <li>Droit d’accès : vous avez le droit d’accéder à tout moment à l’ensemble de vos données personnelles, en vertu de l’article 15 du RGPD.</li>
        <li>Droit de rectification : vous avez le droit de rectifier à tout moment vos données personnelles inexactes, incomplètes ou obsolètes conformément à l’article 16 du RGPD</li>
        <li>Droit à la limitation : vous avez le droit d’obtenir la limitation du traitement de vos données personnelles dans certains cas définis à l’article 18 du RGPD.</li>
        <li>Droit à l’effacement : vous avez le droit d’exiger que vos données personnelles soient effacées, et d’en interdire toute collecte future pour les motifs énoncés à l’article 17 du RGPD</li>
        <li>Droit à la portabilité : selon certaines conditions précisées à l’article 20 du RGPD, vous avez le droit de recevoir les données personnelles que vous nous avez fournies dans un format standard lisible par machine et d’exiger leur transfert au destinataire de votre choix.</li>
        <li>Droit d’opposition : en vertu de l’article 21 du RGPD, vous avez le droit de vous opposer au traitement de vos données personnelles. Notez toutefois que nous pourrons maintenir leur traitement malgré cette opposition, pour des motifs légitimes ou la défense de droits en justice.</li>
      </ul>
      <p>Pour exercer ces droits, vous pouvez nous contacter à l’adresse suivante : <a href="mailto:contact@kodocards.com">contact@kodocards.com</a> ou par courrier au 110 Cours Lieutaud, 13006 Marseille. Si vous estimez, après nous avoir contactés, que vos droits ne sont pas respectés, vous pouvez adresser une réclamation auprès de la CNIL (Commission Nationale de l'Informatique et des Libertés) sur leur site internet (www.cnil.fr).</p>
      <h2>7. Cookies</h2>
      <p>Notre site utilise des cookies pour améliorer votre expérience de navigation et mesurer l'audience. Lors de votre première visite, un bandeau vous informe de la présence de ces cookies et vous permet de les accepter ou de les refuser globalement ou au cas par cas. Pour plus d’informations vous pouvez consulter notre politique de cookie :</p>
      <h2>Modifications de la politique de confidentialité</h2>
      <p>Nous nous réservons le droit de modifier la présente politique de confidentialité à tout moment, notamment pour nous conformer aux évolutions légales ou technologiques. Nous vous invitons à consulter cette page régulièrement.</p>
    </PublicDoc>
  )
}

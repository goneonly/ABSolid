// Privacy Policy and Terms of Service, English version — the Korean original is ko.jsx
// When the Korean original changes, update this file too. The Korean version prevails if the two differ.
import { CONTACT_URL } from './contact.js'

const EFFECTIVE_DATE = 'October 10, 2026'

// Shown at the top of both documents: this is a translation for convenience
function TranslationNote() {
  return (
    <p>
      This is an English translation provided for convenience. If it differs from the Korean original, the Korean
      version prevails.
    </p>
  )
}

export function PrivacyBody() {
  return (
    <>
      <TranslationNote />
      <p>
        ABSolid (the &lsquo;Service&rsquo;) values your personal information and handles it as described below, in
        accordance with the Personal Information Protection Act of Korea.
      </p>

      <strong>1. Personal information we collect</strong>
      <ul>
        <li>
          Sign-up (required): email, password (stored encrypted), name, phone number, confirmation of being 14 or older,
          time of agreeing to the terms
        </li>
        <li>Optional: nickname, profile photo, proof photos, group photos</li>
        <li>
          Created while using the Service: workout records (date, completion time, video watch verification), group
          membership, reports, notification subscription (if you turn on notifications)
        </li>
        <li>
          Collected automatically: browser storage used to keep you signed in and keep your records, and visit
          statistics that can&rsquo;t identify you
        </li>
        <li>Guests: workout records and nickname are stored only on your device and are not sent to the server.</li>
      </ul>

      <strong>2. Why we use it</strong>
      <ul>
        <li>Identifying members, signing in, recovering accounts</li>
        <li>Saving and showing workout records, verifying that videos were watched</li>
        <li>Providing group features (members&rsquo; progress, leaderboard, sharing proof photos)</li>
        <li>Sending workout reminder notifications (if you agree)</li>
        <li>Preventing misuse, handling reports, fixing errors, and improving the Service</li>
      </ul>

      <strong>3. How long we keep it</strong>
      <ul>
        <li>We keep it until you delete your account, and destroy it without delay after that.</li>
        <li>Proof photos are deleted automatically 30 days after their date.</li>
        <li>If a law requires us to keep something, we keep it for that period.</li>
      </ul>

      <strong>4. How we destroy it</strong>
      <p>
        When you delete your account, your account, workout records, photos, and group membership are deleted
        immediately and can&rsquo;t be recovered. Electronic files are deleted in a way that can&rsquo;t be restored.
      </p>

      <strong>5. Sharing with third parties</strong>
      <p>
        We don&rsquo;t provide your personal information to third parties. However, by the nature of the Service, your
        nickname, profile photo, workout progress, and proof photos are visible to members of the same group. Your name
        and phone number are not shown.
      </p>

      <strong>6. Processors and transfers abroad</strong>
      <ul>
        <li>
          Supabase Inc. (USA): member authentication, storing data and photos
          <br />
          Country: Japan (Amazon Web Services Tokyo region) / Items: all member information in section 1 / When and how:
          sent over an encrypted network while you use the Service / Retention: same as section 3
        </li>
        <li>
          Vercel Inc. (USA): serving the website and visit statistics
          <br />
          Country: the USA and other countries where Vercel servers are located / Items: connection information (IP
          address, etc.), visit statistics / When and how: sent over an encrypted network when you visit the website
        </li>
        <li>
          Workout videos play through YouTube (Google LLC), and Google&rsquo;s privacy policy applies when they play.
        </li>
      </ul>
      <p>
        You may refuse the transfer abroad, but then you can&rsquo;t use member features and can only use the Service as
        a guest (stored on your device).
      </p>

      <strong>7. Your rights and how to use them</strong>
      <ul>
        <li>View and correct: check and edit your info yourself under My profile in Settings.</li>
        <li>Delete and stop processing: request anytime with Delete account in Settings.</li>
        <li>For other requests, contact us below and we&rsquo;ll handle them without delay.</li>
      </ul>

      <strong>8. Security measures</strong>
      <ul>
        <li>Passwords stored encrypted, all connections encrypted with HTTPS</li>
        <li>Database access limited to you and your groups, proof photos stored privately</li>
      </ul>

      <strong>9. Children under 14</strong>
      <p>The Service does not accept sign-ups from children under 14.</p>

      <strong>10. Privacy officer and contact</strong>
      <p>
        Privacy officer: the ABSolid operator
        <br />
        Contact:{' '}
        <a href={CONTACT_URL} target="_blank" rel="noreferrer">
          GitHub issues
        </a>
      </p>

      <strong>11. Effective date</strong>
      <p>This policy applies from {EFFECTIVE_DATE}.</p>
    </>
  )
}

export function TermsBody() {
  return (
    <>
      <TranslationNote />
      <strong>Article 1 (Purpose)</strong>
      <p>
        These terms set out the conditions and procedures for using ABSolid (the &lsquo;Service&rsquo;), and the rights
        and duties of users and the operator.
      </p>

      <strong>Article 2 (What the Service provides)</strong>
      <ul>
        <li>Daily ab workout videos (plays external videos published on YouTube)</li>
        <li>Workout records, streaks, weekly reports</li>
        <li>Joining groups, members&rsquo; progress, leaderboard, sharing proof photos</li>
      </ul>

      <strong>Article 3 (Sign-up)</strong>
      <ol>
        <li>Only people aged 14 or older can sign up as members.</li>
        <li>You must enter your own accurate information when signing up and must not use anyone else&rsquo;s.</li>
      </ol>

      <strong>Article 4 (User obligations)</strong>
      <ul>
        <li>Don&rsquo;t falsify records, such as logging workouts you didn&rsquo;t do.</li>
        <li>Don&rsquo;t post photos showing other people&rsquo;s faces or bodies without their consent.</li>
        <li>Don&rsquo;t post obscene or offensive photos, or posts that infringe on others&rsquo; rights.</li>
        <li>Don&rsquo;t interfere with the normal operation of the Service.</li>
      </ul>

      <strong>Article 5 (Posts)</strong>
      <ol>
        <li>You keep the rights to photos you post, and they are visible to members of the same group.</li>
        <li>If a reported post violates these terms or the law, the operator may delete it.</li>
      </ol>

      <strong>Article 6 (Restrictions)</strong>
      <p>If you violate Article 4, we may delete posts or restrict your account without prior notice.</p>

      <strong>Article 7 (Exercise caution)</strong>
      <ol>
        <li>The Service&rsquo;s workout videos and records are not medical advice.</li>
        <li>
          Don&rsquo;t push beyond your health condition. If you feel pain or anything unusual, stop immediately and
          consult a professional.
        </li>
        <li>
          The operator is not responsible for injuries during workouts unless caused by the operator&rsquo;s intent or
          gross negligence.
        </li>
      </ol>

      <strong>Article 8 (Changes and suspension)</strong>
      <p>
        The Service is currently in beta, so features may change or be temporarily suspended. We&rsquo;ll announce
        important changes in the app in advance.
      </p>

      <strong>Article 9 (Limitation of liability)</strong>
      <p>
        The Service is provided free of charge, and the operator is not responsible for damages from using it unless
        caused by the operator&rsquo;s intent or gross negligence. This also applies when it can&rsquo;t be used because
        an external video (YouTube) is taken down.
      </p>

      <strong>Article 10 (Leaving)</strong>
      <p>You can leave anytime with Delete account in Settings, and your data is deleted immediately.</p>

      <strong>Article 11 (Governing law)</strong>
      <p>
        These terms are governed by the laws of the Republic of Korea, and disputes are resolved in the court with
        jurisdiction under the Civil Procedure Act.
      </p>

      <p className="mt-4">These terms apply from {EFFECTIVE_DATE}.</p>
    </>
  )
}

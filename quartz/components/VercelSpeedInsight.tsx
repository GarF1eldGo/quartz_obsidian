import { QuartzComponent } from "./types"

const VercelSpeedInsights: QuartzComponent = () => {
  return (
    <>
      <script
        dangerouslySetInnerHTML={{
          __html: `
window.si = window.si || function () { (window.siq = window.siq || []).push(arguments); };
`,
        }}
      />
      <script defer src="/_vercel/speed-insights/script.js"></script>
    </>
  )
}

export default VercelSpeedInsights
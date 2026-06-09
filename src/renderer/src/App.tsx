import { useState } from 'react'
import { Sidebar } from './components/Sidebar'
import { ErrorBoundary } from './components/ErrorBoundary'
import { WelcomeDialog } from './components/WelcomeDialog'
import { ExitGuard } from './components/ExitGuard'
import { Home } from './pages/Home'
import { Contacts } from './pages/Contacts'
import { Templates } from './pages/Templates'
import { Sending } from './pages/Sending'
import { Reports } from './pages/Reports'
import { Settings } from './pages/Settings'

export type Section = 'home' | 'contacts' | 'templates' | 'sending' | 'reports' | 'settings'

function App(): JSX.Element {
  const [section, setSection] = useState<Section>('home')

  return (
    <div className="flex h-full w-full bg-background text-foreground">
      <Sidebar active={section} onSelect={setSection} />
      <main className="flex-1 overflow-y-auto">
        <ErrorBoundary>
          {section === 'home' && <Home onNavigate={setSection} />}
          {section === 'contacts' && <Contacts />}
          {section === 'templates' && <Templates />}
          {section === 'sending' && <Sending />}
          {section === 'reports' && <Reports />}
          {section === 'settings' && <Settings />}
        </ErrorBoundary>
      </main>
      <WelcomeDialog onStart={() => setSection('settings')} />
      <ExitGuard />
    </div>
  )
}

export default App

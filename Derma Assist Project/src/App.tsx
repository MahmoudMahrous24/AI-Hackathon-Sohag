import { ChatSection } from './components/chat/ChatSection'
import { Hero } from './components/hero/Hero'
import { Footer } from './components/layout/Footer'
import { Header } from './components/layout/Header'
import { WelcomeScreen } from './components/layout/WelcomeScreen'
import { EducationTopics } from './components/sections/EducationTopics'
import { FinalCta } from './components/sections/FinalCta'
import { HowItWorks } from './components/sections/HowItWorks'
import { Safety } from './components/sections/Safety'
import { ChatProvider, useChatContext } from './hooks/useChat'
import { LanguageProvider } from './i18n/LanguageContext'

function AppContent() {
  const { hasJoined } = useChatContext()

  if (!hasJoined) {
    return <WelcomeScreen />
  }

  return (
    <div className="min-h-screen bg-canvas text-text-primary animate-fade-in">
      <Header />
      <main>
        <Hero />
        <ChatSection />
        <HowItWorks />
        <EducationTopics />
        <Safety />
        <FinalCta />
      </main>
      <Footer />
    </div>
  )
}

function App() {
  return (
    <LanguageProvider>
      <ChatProvider>
        <AppContent />
      </ChatProvider>
    </LanguageProvider>
  )
}

export default App

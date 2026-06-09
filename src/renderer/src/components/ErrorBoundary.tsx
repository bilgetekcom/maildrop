import { Component, type ReactNode, type ErrorInfo } from 'react'
import { AlertTriangle, RotateCw } from 'lucide-react'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

const FALLBACK_TEXT = {
  title: {
    tr: 'Beklenmedik bir hata oluştu',
    en: 'Something went wrong'
  },
  body: {
    tr: 'Uygulamayı yeniden başlatabilir veya bu ekranı yenileyebilirsiniz.',
    en: 'You can restart the app or refresh this screen.'
  },
  retry: {
    tr: 'Yeniden dene',
    en: 'Try again'
  }
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('UI error:', error, info)
  }

  reset = (): void => {
    this.setState({ error: null })
  }

  render(): ReactNode {
    if (!this.state.error) return this.props.children

    const lang = (typeof document !== 'undefined' ? document.documentElement.lang : 'tr') as 'tr' | 'en'
    const ln: 'tr' | 'en' = lang === 'en' ? 'en' : 'tr'

    return (
      <div className="flex h-full flex-col items-center justify-center px-8 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-100">
          <AlertTriangle className="h-7 w-7 text-red-600" />
        </div>
        <h1 className="mt-4 text-xl font-semibold">{FALLBACK_TEXT.title[ln]}</h1>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">{FALLBACK_TEXT.body[ln]}</p>
        <pre className="mt-4 max-h-40 max-w-2xl overflow-auto rounded-md bg-muted/50 p-3 text-left text-xs text-muted-foreground">
          {this.state.error.message}
        </pre>
        <button
          onClick={this.reset}
          className="mt-4 inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          <RotateCw className="h-4 w-4" />
          {FALLBACK_TEXT.retry[ln]}
        </button>
      </div>
    )
  }
}

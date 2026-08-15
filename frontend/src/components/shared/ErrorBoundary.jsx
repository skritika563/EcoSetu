/**
 * ErrorBoundary — catches render-time errors anywhere below it and shows a
 * branded fallback instead of a blank white screen.
 *
 * React only supports error boundaries as class components — there is no hook
 * equivalent, so this is deliberately a class.
 *
 * Note: this catches errors thrown during render, in lifecycle methods and in
 * constructors. It does NOT catch errors inside event handlers or async code —
 * those are already handled by try/catch + toast in the pages.
 */

import { Component } from "react";
import { RefreshCw, TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // Replace with a real error reporter (Sentry et al.) when one is added.
    console.error("Unhandled UI error:", error, info?.componentStack);
  }

  handleReset = () => {
    this.setState({ error: null });
  };

  handleGoHome = () => {
    window.location.assign("/");
  };

  render() {
    const { error } = this.state;

    if (!error) {
      return this.props.children;
    }

    return (
      <div
        role="alert"
        className="flex min-h-screen w-full flex-col items-center justify-center gap-5 bg-background px-6 py-12 text-center"
      >
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10">
          <TriangleAlert className="h-6 w-6 text-destructive" strokeWidth={2.2} />
        </div>

        <div className="space-y-2">
          <h1 className="font-heading text-xl font-semibold text-foreground">
            Something went wrong
          </h1>
          <p className="mx-auto max-w-sm text-sm leading-relaxed text-muted-foreground">
            An unexpected error stopped this page from loading. Your account and data are safe —
            try again, or head back to the home page.
          </p>
        </div>

        {/* Developer detail — never shown in production builds. */}
        {import.meta.env.DEV && (
          <pre className="max-w-lg overflow-x-auto rounded-lg border border-border bg-muted/40 p-3 text-left text-xs text-muted-foreground">
            {error.message}
          </pre>
        )}

        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button onClick={this.handleReset}>
            <RefreshCw className="mr-1.5 h-4 w-4" />
            Try again
          </Button>
          <Button variant="outline" onClick={this.handleGoHome}>
            Go to home
          </Button>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;

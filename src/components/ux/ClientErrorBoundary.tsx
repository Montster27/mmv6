"use client";

import React from "react";
import { getAppMode } from "@/lib/mode";

type ClientErrorBoundaryProps = {
  children: React.ReactNode;
};

type ClientErrorBoundaryState = {
  hasError: boolean;
  error?: Error;
};

export class ClientErrorBoundary extends React.Component<
  ClientErrorBoundaryProps,
  ClientErrorBoundaryState
> {
  state: ClientErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(error: Error): ClientErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error) {
    if (typeof window !== "undefined") {
      (window as any).__MMV_LAST_CLIENT_ERROR__ = {
        message: error.message,
        stack: error.stack,
      };
    }
    console.error("Client error boundary caught", error);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    const testerMode = getAppMode().testerMode;
    return (
      <div className="min-h-[60vh] rounded-md border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-800">
        <h2 className="text-lg font-semibold">Something went wrong.</h2>
        <p className="mt-1">
          Refresh the page or toggle the feature back off.
        </p>
        {testerMode && this.state.error ? (
          <pre className="mt-3 whitespace-pre-wrap rounded-md border border-red-200 bg-white px-3 py-2 text-xs text-red-700">
            {this.state.error.message}
            {"\n"}
            {this.state.error.stack}
          </pre>
        ) : null}
      </div>
    );
  }
}

import { createRoot } from "react-dom/client";
import { ApolloProvider } from '@apollo/client/react';
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { apolloClient } from '@/lib/apolloClient';
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <ApolloProvider client={apolloClient}>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </ApolloProvider>
);

// Made with Bob

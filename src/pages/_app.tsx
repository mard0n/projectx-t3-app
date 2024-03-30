import { type AppType } from "next/app";

import { api } from "~/utils/api";

import "~/styles/globals.css";
import Head from "next/head";

import "@fontsource/inter";
import "@fontsource/libre-baskerville";
import GlobalStyles from "@mui/joy/GlobalStyles";
import { CssVarsProvider } from "@mui/joy";
import Layout from "~/components/Layout";

const MyApp: AppType = ({ Component, pageProps }) => {
  return (
    <>
      <Head>
        <title>Create T3 App</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <Layout>
        <CssVarsProvider>
          <GlobalStyles
            styles={{
              "& .lucide": {
                color: "var(--Icon-color)",
                margin: "var(--Icon-margin)",
                fontSize: "var(--Icon-fontSize, 20px)",
                width: "1em",
                height: "1em",
              },
            }}
          />
          <Component {...pageProps} />
        </CssVarsProvider>
      </Layout>
    </>
  );
};

export default api.withTRPC(MyApp);

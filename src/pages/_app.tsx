import { type AppType } from "next/app";

import { api } from "~/utils/api";

import "~/styles/globals.css";
import Head from "next/head";
import Layout from "~/components/Layout";

import "@fontsource/inter";
import GlobalStyles from "@mui/joy/GlobalStyles";

const MyApp: AppType = ({ Component, pageProps }) => {
  return (
    <>
      <Head>
        <title>Create T3 App</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <Layout>
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
      </Layout>
    </>
  );
};

export default api.withTRPC(MyApp);

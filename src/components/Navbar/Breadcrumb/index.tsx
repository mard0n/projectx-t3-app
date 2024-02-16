"use client";
import React, { ReactNode } from "react";

import { usePathname, useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "~/utils/api";

const Breadcrumb = () => {
  const paths = usePathname();
  console.log("paths", paths);
  // const notes = api.note.getAll.useQuery();

  const pathNames = paths.split("/").filter((path) => path);
  console.log("pathNames", pathNames);

  return (
    <div>
      <ul>
        <li>
          <Link href={"/notes"}>Notes</Link>
        </li>
        {/* {pathNames.map((link, index) => {
          console.log("link", link);

          const href = `/${pathNames.slice(0, index + 1).join("/")}`;

          // const itemClasses =
          //   paths === href ? `${listClasses} ${activeClasses}` : listClasses;
          // const itemLink = capitalizeLinks
          //   ? link[0]?.toUpperCase() + link.slice(1, link.length)
          //   : link;
          // console.log('pathNames', pathNames);
          // console.log('notes.data?.find((note) => note.id === link)', notes.data?.find((note) => note.id === link));
          
          // const noteTitle =
          //   pathNames.length > 1
          //     ? notes.data?.find((note) => note.id === link)?.content ??
          //       "Empty Note"
          //     : link ?? "";
          return (
            <React.Fragment key={link}>
              <li>
                <Link href={href}>{link}</Link>
              </li>
              {pathNames.length !== index + 1 ? ">" : null}
            </React.Fragment>
          );
        })} */}
      </ul>
    </div>
  );
};

export default Breadcrumb;

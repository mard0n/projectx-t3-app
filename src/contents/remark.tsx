import {
  QueryClient,
  QueryClientProvider,
  useMutation,
  useQuery,
} from "@tanstack/react-query";
import { type PlasmoCSConfig } from "plasmo";
import {
  type ChangeEvent,
  useEffect,
  useState,
  type FocusEvent,
  useRef,
} from "react";
import { fetchRemarks } from "~/background/messages/fetchRemarks";
import {
  createRemarkPost,
  deleteRemarkPost,
  updateRemarkPost,
} from "~/background/messages/postRemark";
import type { SerializedBlockRemarkNode } from "~/nodes/BlockRemark";
import { createRemarkData } from "~/utils/extension/remark";

const queryClient = new QueryClient();

export const config: PlasmoCSConfig = {
  // matches: ["<all_urls>"],
  matches: ["http://localhost/*"],
  all_frames: true,
  run_at: "document_idle",
};

const Remark = () => {
  const { data: remarks } = useQuery({
    queryKey: ["fetchRemarks"],
    queryFn: fetchRemarks,
  });
  console.log("remarks", remarks);

  const createRemarkQuery = useMutation({
    mutationFn: (remark: SerializedBlockRemarkNode) => {
      return createRemarkPost(remark);
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["fetchRemarks"] }),
  });
  const deleteRemarkQuery = useMutation({
    mutationFn: (remarkId: string) => {
      return deleteRemarkPost(remarkId);
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["fetchRemarks"] }),
  });
  const updateRemarkQuery = useMutation({
    mutationFn: (remark: SerializedBlockRemarkNode) => {
      return updateRemarkPost(remark);
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["fetchRemarks"] }),
  });

  const [activeRemark, setActiveRemark] = useState(false);
  console.log("activeRemark", activeRemark);

  const handleActiveRemarkMode = (e: MouseEvent) => {
    void (async () => {
      if (activeRemark) {
        setActiveRemark(false);
        const remarkRect = {
          top: e.pageY,
          bottom: e.pageY,
          left: e.pageX,
          right: e.pageX,
          x: e.pageX,
          y: e.pageY,
          height: 0,
          width: 0,
        };
        const newRemarkData = await createRemarkData(remarkRect);
        if (!newRemarkData) return;
        void createRemarkQuery.mutate(newRemarkData);
      }
    })();
  };
  const handleDeactivateRemarkMode = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      setActiveRemark(false);
    }
  };

  const handleRemarkTextChange = (
    e: ChangeEvent<HTMLInputElement>,
    remarkId: string,
  ) => {
    void (async () => {
      const text = e.target.value;
      const currentRemark = remarks?.find((remark) => remark.id === remarkId);

      if (!currentRemark) return;
      currentRemark.properties.remarkText = text;
      updateRemarkQuery.mutate(currentRemark);
    })();
  };

  const handleRemarkBlur = (
    e: FocusEvent<HTMLInputElement, Element>,
    remarkId: string,
  ) => {
    const text = e.target.value;
    if (!text) deleteRemarkQuery.mutate(remarkId);
  };

  // const handleRemarkReposition = (newPosition: RectType, remarkId: string) => {
  //   void (async () => {
  //     const currentRemark = remarks?.find((remark) => remark.id === remarkId);
  //     console.log("newPosition", newPosition);

  //     if (!currentRemark) return;
  //     currentRemark.properties.remarkRect = newPosition;
  //     updateRemarkQuery.mutate(currentRemark);
  //   })();
  // };

  useEffect(() => {
    if (activeRemark) {
      document.documentElement.style.cursor = "pointer";
    } else {
      document.documentElement.style.removeProperty("cursor");
    }

    document.addEventListener("mousedown", handleActiveRemarkMode);
    document.addEventListener("keydown", handleDeactivateRemarkMode);
    return () => {
      document.removeEventListener("mousedown", handleActiveRemarkMode);
      document.removeEventListener("keypress", handleDeactivateRemarkMode);
    };
  }, [activeRemark]);

  if (!remarks) return <></>;

  return (
    <>
      {/* <button
        onClick={() => {
          setActiveRemark(true);
        }}
      >
        Activate drop comment
      </button> */}
      {remarks.map((remark) => {
        return (
          <RemarkItem
            key={remark.id}
            remark={remark}
            handleRemarkTextChange={handleRemarkTextChange}
            handleRemarkBlur={handleRemarkBlur}
            // handleRemarkReposition={handleRemarkReposition}
          />
        );
      })}
    </>
  );
};

const RemarkItem = ({
  remark,
  handleRemarkTextChange,
  handleRemarkBlur,
  // handleRemarkReposition,
}: {
  remark: SerializedBlockRemarkNode;
  handleRemarkTextChange: (
    e: ChangeEvent<HTMLInputElement>,
    remarkId: string,
  ) => void;
  handleRemarkBlur: (
    e: FocusEvent<HTMLInputElement, Element>,
    remarkId: string,
  ) => void;
  // handleRemarkReposition: (newPosition: RectType, remarkId: string) => void;
}) => {
  const remarkItemRef = useRef<HTMLDivElement | null>(null);
  // const isBeingRepositioned = useRef(false);

  // useEffect(() => {
  //   document.addEventListener("mousemove", (e) => {
  //     if (remarkItemRef.current && isBeingRepositioned.current) {
  //       remarkItemRef.current.style.top = e.pageY + "px";
  //       remarkItemRef.current.style.left = e.pageX + "px";
  //     }
  //   });
  //   document.addEventListener("mouseup", (e) => {
  //     if (remarkItemRef.current) {
  //       remarkItemRef.current.style.cursor = "grab";
  //       isBeingRepositioned.current = false;
  //       document.body.style.removeProperty("user-select");
  //     }

  //     const newPosition = {
  //       left: e.pageX,
  //       right: e.pageX,
  //       top: e.pageY,
  //       bottom: e.pageY,
  //       height: 0,
  //       width: 0,
  //       x: e.pageX,
  //       y: e.pageY,
  //     };
  //     handleRemarkReposition(newPosition, remark.id);
  //   });

  //   return () => {};
  // }, []);

  return (
    <div
      key={remark.id}
      ref={remarkItemRef}
      style={{
        position: "absolute",
        top: remark.properties.remarkRect.top,
        left: remark.properties.remarkRect.left,
        display: "flex",
        gap: 12,
      }}
    >
      {/* <span
        style={{
          width: 20,
          height: 20,
          cursor: "grab",
          backgroundColor: "#333",
        }}
        onMouseDown={() => {
          if (remarkItemRef.current) {
            remarkItemRef.current.style.cursor = "grabbing";
            isBeingRepositioned.current = true;
            document.body.style.userSelect = "none";
          }
        }}
      ></span> */}
      <input
        type="text"
        defaultValue={remark.properties.remarkText}
        onChange={(e) => handleRemarkTextChange(e, remark.id)}
        onBlur={(e) => handleRemarkBlur(e, remark.id)}
      />
    </div>
  );
};

const Wrapper = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <Remark />
    </QueryClientProvider>
  );
};

export default Wrapper;

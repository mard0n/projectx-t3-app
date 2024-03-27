import { useEffect, useState } from "react";
import List from "@mui/joy/List";
import ListItem from "@mui/joy/ListItem";
import ListItemButton from "@mui/joy/ListItemButton";
import ListItemContent from "@mui/joy/ListItemContent";
import Link from "@mui/joy/Link";
import { ListDivider } from "@mui/joy";
import Kbd from "~/components/joyui/Kbd";
import { Storage } from "@plasmohq/storage";
import { callContentScript } from "~/utils/extension";
import { ArrowUpRight } from "lucide-react";
const storage = new Storage();

function IndexPopup() {
  const [isTextSelected, setIsTextSelected] = useState(false);
  useEffect(() => {
    console.log("popup init");

    storage
      .get("isTextSelected")
      .then((result) => {
        console.log("storage result", result);
        // TODO check only current tab's selection
        setIsTextSelected(Boolean(result));
      })
      .catch(() => null);
  }, []);
  const handleBookmarkClick = () => {
    console.log("handleBookmarkClick");
    // void (async () => {
    //   console.log("message sent");
    //   await chrome.runtime.sendMessage({ greeting: "hello" });
    // })();
    // window.close();
  };
  const handleHighlightClick = () => {
    console.log("handleHighlightClick");
    void callContentScript("highlight");
    // window.close();
  };
  const handleCommentClick = () => {
    console.log("handleCommentClick");
    // window.close();
  };
  const handleRemarkClick = () => {
    console.log("handleRemarkClick");
    // window.close();
  };
  const handleScreenshotClick = () => {
    console.log("handleScreenshotClick");
    // window.close();
  };

  return (
    <>
      <List
        sx={{
          minWidth: 300,
          borderRadius: "sm",
        }}
      >
        <ListItem>
          <ListItemContent>
            <Link level="title-lg" endDecorator={<ArrowUpRight />}>
              Rumi dashboard
            </Link>
          </ListItemContent>
        </ListItem>
        <ListDivider />
        <ListItem>
          <ListItemButton onClick={handleBookmarkClick}>
            <ListItemContent>Bookmark</ListItemContent>
            <Kbd>⌥</Kbd>
            <Kbd>B</Kbd>
          </ListItemButton>
        </ListItem>
        <ListItem>
          <ListItemButton
            disabled={!isTextSelected}
            onClick={handleHighlightClick}
          >
            <ListItemContent>Highlight</ListItemContent>
            <Kbd>⌥</Kbd>
            <Kbd>H</Kbd>
          </ListItemButton>
        </ListItem>
        <ListItem>
          <ListItemButton
            disabled={!isTextSelected}
            onClick={handleCommentClick}
          >
            <ListItemContent>Comment</ListItemContent>
            <Kbd>⌥</Kbd>
            <Kbd>C</Kbd>
          </ListItemButton>
        </ListItem>
        <ListItem>
          <ListItemButton onClick={handleRemarkClick}>
            <ListItemContent>Remark</ListItemContent>
            <Kbd>⌥</Kbd>
            <Kbd>R</Kbd>
          </ListItemButton>
        </ListItem>
        <ListItem>
          <ListItemButton onClick={handleScreenshotClick}>
            <ListItemContent>Screenshot</ListItemContent>
            <Kbd>⌥</Kbd>
            <Kbd>S</Kbd>
          </ListItemButton>
        </ListItem>
      </List>
    </>
  );
}

export default IndexPopup;

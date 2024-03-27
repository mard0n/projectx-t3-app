import List from "@mui/joy/List";
import ListItem from "@mui/joy/ListItem";
import ListItemButton from "@mui/joy/ListItemButton";
import ListItemContent from "@mui/joy/ListItemContent";
import Link from "@mui/joy/Link";
import { ListDivider } from "@mui/joy";
import Kbd from "~/components/joyui/Kbd";
import { callContentScript } from "~/utils/extension";
import { ArrowUpRight } from "lucide-react";
import { useStorage } from "@plasmohq/storage/hook";

function IndexPopup() {
  const [isTextSelected] = useStorage<boolean>("is-text-selected");
  const [highlightInit] = useStorage<boolean>("highlight-init");
  const [bookmarkInit] = useStorage<boolean>("bookmark-init");
  const [screenshotInit] = useStorage<boolean>("screenshot-init");
  const [youtubeInit] = useStorage<boolean>("youtube-init");

  const handleBookmarkClick = () => {
    void callContentScript("bookmark");
    window.close();
  };
  const handleHighlightClick = () => {
    void callContentScript("highlight");
    window.close();
  };
  const handleCommentClick = () => {
    void callContentScript("highlight-comment");
    window.close();
  };
  const handleScreenshotClick = () => {
    void callContentScript("screenshot");
    window.close();
  };
  const handleYoutubeMarkClick = () => {
    void callContentScript("youtube-mark");
    window.close();
  };
  const handleYoutubeCommentClick = () => {
    void callContentScript("youtube-mark-comment");
    window.close();
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
        {bookmarkInit ? (
          <ListItem>
            <ListItemButton onClick={handleBookmarkClick}>
              <ListItemContent>Bookmark</ListItemContent>
              <Kbd>⌥</Kbd>
              <Kbd>B</Kbd>
            </ListItemButton>
          </ListItem>
        ) : null}
        {highlightInit ? (
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
        ) : null}
        {highlightInit ? (
          <ListItem>
            <ListItemButton
              disabled={!isTextSelected}
              onClick={handleCommentClick}
            >
              <ListItemContent>Comment</ListItemContent>
              <Kbd>⌥</Kbd>
              <Kbd>⇧</Kbd>
              <Kbd>H</Kbd>
            </ListItemButton>
          </ListItem>
        ) : null}
        {/* <ListItem>
          <ListItemButton onClick={handleRemarkClick}>
            <ListItemContent>Remark</ListItemContent>
            <Kbd>⌥</Kbd>
            <Kbd>R</Kbd>
          </ListItemButton>
        </ListItem> */}
        {screenshotInit ? (
          <ListItem>
            <ListItemButton onClick={handleScreenshotClick}>
              <ListItemContent>Screenshot</ListItemContent>
              <Kbd>⌥</Kbd>
              <Kbd>S</Kbd>
            </ListItemButton>
          </ListItem>
        ) : null}
        {youtubeInit ? (
          <ListItem>
            <ListItemButton onClick={handleYoutubeMarkClick}>
              <ListItemContent>Mark</ListItemContent>
              <Kbd>⌥</Kbd>
              <Kbd>M</Kbd>
            </ListItemButton>
          </ListItem>
        ) : null}
        {youtubeInit ? (
          <ListItem>
            <ListItemButton onClick={handleYoutubeCommentClick}>
              <ListItemContent>Mark and comment</ListItemContent>
              <Kbd>⌥</Kbd>
              <Kbd>⇧</Kbd>
              <Kbd>M</Kbd>
            </ListItemButton>
          </ListItem>
        ) : null}
      </List>
    </>
  );
}

export default IndexPopup;

import { fireEvent, render, screen } from "@testing-library/react";
import { DealPhotos } from "./DealPhotos";

test("hero is on the left and four squares sit on the right", () => {
  render(<DealPhotos photos={["/a.jpg", "/b.jpg", "/c.jpg", "/d.jpg", "/e.jpg"]} />);
  const tiles = screen.getAllByTestId("image-grid");
  expect(tiles).toHaveLength(5);
  expect(tiles[0].querySelector("img")).toHaveAttribute("src", "/a.jpg");
  expect(tiles[1].querySelector("img")).toHaveAttribute("src", "/b.jpg");
  expect(screen.getByText("View more")).toBeInTheDocument();
});

test("empty squares show a placeholder", () => {
  render(<DealPhotos photos={["/a.jpg"]} />);
  const placeholders = screen.getAllByText("No Available Photos");
  expect(placeholders).toHaveLength(4);
  expect(placeholders[0].className).toMatch(/items-center/);
  expect(placeholders[0].className).toMatch(/justify-center/);
  expect(placeholders[0].className).toMatch(/absolute inset-0/);
});

test("a listing with no photos still shows the hero and four empty squares", () => {
  render(<DealPhotos photos={[]} />);
  expect(screen.getAllByTestId("image-grid")).toHaveLength(5);
  expect(screen.getAllByText("No Available Photos")).toHaveLength(5);
  fireEvent.click(screen.getByText("View more"));
  expect(screen.queryByTestId("photo-lightbox")).not.toBeInTheDocument();
});

test("clicking a right-hand tile opens that photo", () => {
  render(<DealPhotos photos={["/a.jpg", "/b.jpg"]} />);
  fireEvent.click(screen.getAllByTestId("image-grid")[1].querySelector("button")!);
  expect(screen.getByTestId("photo-lightbox")).toBeInTheDocument();
  expect(screen.getByText("2 / 2")).toBeInTheDocument();
});

test("lightbox filmstrip shows every photo and grows the current one", () => {
  render(<DealPhotos photos={["/a.jpg", "/b.jpg", "/c.jpg"]} />);
  fireEvent.click(screen.getByText("View more"));
  const thumbs = screen.getAllByTestId("photo-filmstrip-thumb");
  expect(thumbs).toHaveLength(3);
  expect(thumbs[0]).toHaveAttribute("data-active", "true");
  expect(thumbs[1]).toHaveAttribute("data-active", "false");
  expect(screen.getByTestId("photo-lightbox-main")).toHaveAttribute("src", "/a.jpg");
  fireEvent.click(thumbs[2]);
  expect(screen.getByText("3 / 3")).toBeInTheDocument();
  expect(screen.getByTestId("photo-lightbox-main")).toHaveAttribute("src", "/c.jpg");
  expect(screen.getAllByTestId("photo-filmstrip-thumb")[2]).toHaveAttribute("data-active", "true");
  fireEvent.click(screen.getByLabelText("Next photo"));
  expect(screen.getByText("1 / 3")).toBeInTheDocument();
  expect(screen.getAllByTestId("photo-filmstrip-thumb")[0]).toHaveAttribute("data-active", "true");
});

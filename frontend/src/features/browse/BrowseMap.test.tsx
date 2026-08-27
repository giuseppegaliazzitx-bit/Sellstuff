import { bucketPins } from "./BrowseMap";
import type { MapPin } from "../../shared/api/types";

function pin(id: string, lat: number, lng: number): MapPin {
  return {
    id,
    lat,
    lng,
    list_price_cents: 1,
    price_label: "$1",
    status: "available",
    reduced: false,
    offers_due_at: null,
  };
}

test("a single pin is never clustered", () => {
  const buckets = bucketPins([pin("1", 32.7767, -96.797)], 8);
  expect(buckets).toHaveLength(1);
  expect(buckets[0].pins).toHaveLength(1);
  expect(buckets[0].pins[0].id).toBe("1");
});

test("street zoom keeps pins separate; city zoom can cluster", () => {
  const pins = [pin("a", 32.7767, -96.797), pin("b", 32.7768, -96.7971)];
  expect(bucketPins(pins, 14)).toHaveLength(2);
  const city = bucketPins(pins, 10);
  expect(city).toHaveLength(1);
  expect(city[0].pins.map((p) => p.id).sort()).toEqual(["a", "b"]);
});

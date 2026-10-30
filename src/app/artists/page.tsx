import { redirect } from "next/navigation";

// Backward-compatible route: artists are represented by verified bands.
export default function ArtistsPage() {
  redirect("/bands");
}

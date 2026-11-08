import { useListing } from "@/hooks/useListings";
import { PropertyCard } from "./PropertyCard";
import { Skeleton } from "@/ui/kit";

/** Loads one stay (local or partner) by id and shows its card; hides if gone. */
export const StayById = ({ id }: { id: string }) => {
  const { data, loading } = useListing(id);
  if (loading) return <Skeleton className="aspect-[4/5] w-full rounded-xl" />;
  if (!data) return null;
  return <PropertyCard p={data} />;
};

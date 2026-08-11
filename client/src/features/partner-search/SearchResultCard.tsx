// T025: SearchResultCard component — SCRUM-26 / SCRUM-27
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { PartnerServiceItem } from "./partnerSearch.types";

interface SearchResultCardProps {
  item: PartnerServiceItem;
}

export function SearchResultCard({ item }: SearchResultCardProps) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base font-semibold text-slate-900 leading-tight">
            {item.name}
          </CardTitle>
          {item.category && (
            <Badge variant="secondary" className="shrink-0 text-xs">
              {item.category}
            </Badge>
          )}
        </div>
        {item.partnerName && (
          <p className="text-sm text-slate-500 mt-1">{item.partnerName}</p>
        )}
      </CardHeader>
      {item.description && (
        <CardContent className="pt-0">
          <p className="text-sm text-slate-600 line-clamp-3">{item.description}</p>
        </CardContent>
      )}
    </Card>
  );
}

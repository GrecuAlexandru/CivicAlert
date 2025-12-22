import { renderToStaticMarkup } from "react-dom/server";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Ticket } from "@/app/types";
import { ExternalLink } from "lucide-react";
import React from 'react';

const Popup = ({ ticket }: { ticket: Ticket }) => {
  return (
    <div className="flex flex-col gap-2 w-[200px] font-sans text-center items-center">
      {ticket.imageUrls?.[0] && (
        <div className="relative w-full h-[120px] rounded-md overflow-hidden shadow-sm group">
          <img 
            src={ticket.imageUrls[0]} 
            alt={ticket.title || "Ticket Image"} 
            className="w-full h-full object-cover"
          />
          <div className="absolute top-1.5 right-1.5">
             <Badge 
               variant={ticket.status === 'resolved' ? 'default' : 'secondary'} 
               className="h-4 px-1.5 text-[9px] uppercase tracking-wider shadow-sm/50 backdrop-blur-md bg-opacity-90"
             >
                {ticket.status}
             </Badge>
          </div>
        </div>
      )}
      
      <div className="space-y-1 w-full flex flex-col items-center">
        <Badge variant="outline" className="h-4 px-1.5 border-primary/20 text-primary bg-primary/5 text-[9px] uppercase tracking-wider font-semibold w-fit">
            {ticket.category}
        </Badge>
        
        <h3 className="font-bold text-sm leading-tight text-foreground tracking-tight line-clamp-1 w-full px-1">
            {ticket.title || "Incident Report"}
        </h3>
        
        <p className="text-muted-foreground text-xs line-clamp-2 leading-relaxed px-1">
            {ticket.description}
        </p>
      </div>
    </div>
  )
}

export function getPopupContent(ticket: Ticket) {
  return renderToStaticMarkup(<Popup ticket={ticket} />);
}

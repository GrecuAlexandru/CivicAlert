export interface Ticket {
  id: string;
  userId: string;
  title?: string;
  category: string;
  description: string;
  status: string;
  location: {
    latitude: number;
    longitude: number;
  };
  imageUrls: string[];
  votes: string[];
  createdAt: any;
}

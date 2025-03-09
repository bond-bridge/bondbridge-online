import { MoreHorizontal, Heart, MessageCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface PostProps {
  user: string;
  avatar: string;
  postDate: string;
  caption: string;
  image: string;
  likes: number;
  comments: number;
  datePosted: string;
}

export function Post({ user, avatar, postDate, caption, image, likes, comments, datePosted }: PostProps) {
  return (
    <Card className="rounded-none border-x-0 border-t-0 shadow-none mb-2">
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          <Avatar>
            <AvatarImage src={avatar} alt={user} />
            <AvatarFallback>{user?.charAt(0)}</AvatarFallback>
          </Avatar>
          <div>
            <p className="font-semibold">{user}</p>
            <p className="text-sm text-muted-foreground">{postDate}</p>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger>
            <MoreHorizontal className="w-5 h-5" />
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem>Profile</DropdownMenuItem>
            <DropdownMenuItem>Billing</DropdownMenuItem>
            <DropdownMenuItem>Team</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <CardContent className="mt-4">
        <p className="text-card-foreground">{caption}</p>
        {image && (
          <img
            src={image}
            alt="Post"
            className="w-full h-auto mt-4 rounded-lg"
          />
        )}
        <div className="flex items-center justify-between mt-4 text-muted-foreground">
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-1 hover:text-destructive">
              <Heart className="w-5 h-5" /> {likes}
            </button>
            <button className="flex items-center gap-1 hover:text-primary">
              <MessageCircle className="w-5 h-5" /> {comments}
            </button>
          </div>
          <div className="text-sm text-muted-foreground mr-3">{datePosted}</div>
        </div>
      </CardContent>
    </Card>
  );
}
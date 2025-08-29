import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Badge } from "./ui/badge";
import { User } from "lucide-react";

interface UserInfo {
  name: string;
  email: string;
  picture: string;
  sub: string;
}

interface UserWelcomeCardProps {
  user: UserInfo;
}

export function UserWelcomeCard({ user }: UserWelcomeCardProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src={user.picture} alt={user.name} />
            <AvatarFallback className="text-lg">
              {user.name.charAt(0)}
            </AvatarFallback>
          </Avatar>
          <div className="space-y-1">
            <CardTitle className="text-2xl">
              Welcome back, {user.name}!
            </CardTitle>
            <CardDescription className="text-base">
              {user.email}
            </CardDescription>
            <Badge variant="secondary" className="w-fit">
              <User className="h-3 w-3 mr-1" />
              Authenticated User
            </Badge>
          </div>
        </div>
      </CardHeader>
    </Card>
  );
}

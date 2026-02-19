'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Trophy, Medal, Award, Clock, AlertTriangle } from 'lucide-react';
import { formatResponseTime, getCompletionRateColor } from '@/hooks/useTaskAnalytics';
import { getTaskUserDisplayName } from '@/types/task';
import type { TaskPerformerStats } from '@/types/task';

interface TopPerformersTableProps {
  performers: TaskPerformerStats[];
}

export function TopPerformersTable({ performers }: TopPerformersTableProps) {
  if (performers.length === 0) {
    return (
      <div className="flex h-[300px] flex-col items-center justify-center text-muted-foreground">
        <Trophy className="mb-2 h-8 w-8" />
        <p className="text-lg font-medium text-foreground">No Performance Data</p>
        <p className="text-sm">No completed assignments in this period</p>
      </div>
    );
  }

  const getRankIcon = (index: number) => {
    switch (index) {
      case 0:
        return <Trophy className="h-5 w-5 text-slate-700" />;
      case 1:
        return <Medal className="h-5 w-5 text-slate-500" />;
      case 2:
        return <Award className="h-5 w-5 text-slate-400" />;
      default:
        return <span className="flex h-5 w-5 items-center justify-center text-sm text-muted-foreground">{index + 1}</span>;
    }
  };

  const getInitials = (performer: TaskPerformerStats): string => {
    const first = performer.user.first_name?.[0] || '';
    const last = performer.user.last_name?.[0] || '';
    if (first || last) return `${first}${last}`.toUpperCase();
    return performer.user.email[0].toUpperCase();
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[50px]">Rank</TableHead>
            <TableHead>User</TableHead>
            <TableHead className="text-center">Assigned</TableHead>
            <TableHead className="text-center">Completed</TableHead>
            <TableHead>Completion Rate</TableHead>
            <TableHead className="text-center">
              <div className="flex items-center justify-center gap-1">
                <Clock className="h-4 w-4" />
                <span>Avg Time</span>
              </div>
            </TableHead>
            <TableHead className="text-center">
              <div className="flex items-center justify-center gap-1">
                <AlertTriangle className="h-4 w-4" />
                <span>Overdue</span>
              </div>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {performers.map((performer, index) => (
            <TableRow key={performer.user.id}>
              <TableCell>
                <div className="flex justify-center">{getRankIcon(index)}</div>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    {performer.user.avatar_url && (
                      <AvatarImage src={performer.user.avatar_url} />
                    )}
                    <AvatarFallback className="text-xs">
                      {getInitials(performer)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{getTaskUserDisplayName(performer.user)}</p>
                    <p className="text-xs text-muted-foreground">{performer.user.email}</p>
                  </div>
                </div>
              </TableCell>
              <TableCell className="text-center">
                <span className="font-medium">{performer.assigned_count}</span>
              </TableCell>
              <TableCell className="text-center">
                <span className="font-medium text-slate-700">{performer.completed_count}</span>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Progress value={performer.completion_rate} className="h-2 w-20" />
                  <span className={`text-sm font-medium ${getCompletionRateColor(performer.completion_rate)}`}>
                    {performer.completion_rate}%
                  </span>
                </div>
              </TableCell>
              <TableCell className="text-center">
                <span className="text-sm">
                  {formatResponseTime(performer.avg_response_time)}
                </span>
              </TableCell>
              <TableCell className="text-center">
                {performer.overdue_count > 0 ? (
                  <Badge variant="outline" className="bg-slate-100 text-slate-700 font-normal">
                    {performer.overdue_count}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-slate-50 text-slate-500">
                    0
                  </Badge>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

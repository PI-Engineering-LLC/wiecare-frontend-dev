import React, { useState, useEffect } from 'react';
import { api } from '@/api/apiClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, CheckCircle, Circle, Trash2, Info, AlertTriangle, CheckCircle2, XCircle, Megaphone } from 'lucide-react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import PageHeader from '@/components/shared/PageHeader';
import EmptyState from '@/components/shared/EmptyState';
import { formatInTimeZone } from 'date-fns-tz';
import { useAuth } from '@/lib/AuthContext';
import { toast } from 'sonner';
import NotificationItem from '@/components/shared/NotificationItem';

export default function Notifications() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['notifications', user?.id], 
    queryFn: () => api.getNotifications({ order: '-created_at', limit: 100 }),
    enabled: !!user?.id, 
  });

  const markReadMutation = useMutation({
    mutationFn: (id) => api.markRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications']});
      queryClient.invalidateQueries({ queryKey: ['notif-panel']}); 
    },
    onError: (error) => {
        console.error('Failed to mark notification as read:', error);
        toast.error(`Failed to mark notification as read: ${error.response?.data?.error || error.message}`);
    }
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => api.markAllRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications']});
      queryClient.invalidateQueries({ queryKey: ['notif-panel']}); 
      toast.success('All notifications marked as read.');
    },
    onError: (error) => {
        console.error('Failed to mark all notifications as read:', error);
        toast.error(`Failed to mark all as read: ${error.response?.data?.error || error.message}`);
    }
  });

  const deleteNotification = useMutation({
    mutationFn: (id) => api.deleteNotif(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications']});
      queryClient.invalidateQueries({ queryKey: ['notif-panel']}); 
      toast.success('Notification deleted.');
    },
    onError: (error) => {
        console.error('Failed to delete notification:', error);
        toast.error(`Failed to delete notification: ${error.response?.data?.error || error.message}`);
    }
  });

  const clearAllReadMutation = useMutation({
    mutationFn: () => api.clearReadNotifs(), 
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications']});
      queryClient.invalidateQueries({ queryKey: ['notif-panel']}); 
      toast.success('All read notifications cleared.');
    },
    onError: (error) => {
        console.error('Failed to clear read notifications:', error);
        toast.error(`Failed to clear read notifications: ${error.response?.data?.error || error.message}`);
    }
  });

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const getTypeIcon = (type) => {
    switch (type) {
      case 'success': return <CheckCircle2 className="h-5 w-5 text-emerald-500" />;
      case 'warning': return <AlertTriangle className="h-5 w-5 text-amber-500" />;
      case 'error': return <XCircle className="h-5 w-5 text-rose-500" />;
      case 'announcement': return <Megaphone className="h-5 w-5 text-violet-500" />;
      case 'reminder': return <Bell className="h-5 w-5 text-blue-500" />;
      default: return <Info className="h-5 w-5 text-slate-400" />;
    }
  };

  const getCategoryColor = (category) => {
    const colors = {
      invoice: 'bg-rose-100 text-rose-700',
      maintenance: 'bg-amber-100 text-amber-700',
      training: 'bg-emerald-100 text-emerald-700',
      order: 'bg-blue-100 text-blue-700',
      quote: 'bg-violet-100 text-violet-700',
      warranty: 'bg-cyan-100 text-cyan-700',
      system: 'bg-slate-100 text-slate-700',
      general: 'bg-slate-100 text-slate-700',
    };
    return colors[category] || colors.general;
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notifications"
        subtitle={`${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}`}
        actions={
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <Button
                variant="outline"
                onClick={() => markAllReadMutation.mutate()}
                disabled={markAllReadMutation.isPending}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Mark all as read
              </Button>
            )}
            {notifications.some(n => n.is_read) && (
              <Button
                variant="outline"
                onClick={() => clearAllReadMutation.mutate()}
                disabled={clearAllReadMutation.isPending}
                className="text-rose-500 border-rose-200 hover:bg-rose-50"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Clear read
              </Button>
            )}
          </div>
        }
      />

      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">All ({notifications.length})</TabsTrigger>
          <TabsTrigger value="unread">Unread ({unreadCount})</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-6">
          <NotificationList
            notifications={notifications}
            onMarkRead={(id) => markReadMutation.mutate(id)}
            onDelete={(id) => deleteNotification.mutate(id)}
            getTypeIcon={getTypeIcon}
            getCategoryColor={getCategoryColor}
          />
        </TabsContent>

        <TabsContent value="unread" className="mt-6">
          <NotificationList
            notifications={notifications.filter(n => !n.is_read)}
            onMarkRead={(id) => markReadMutation.mutate(id)}
            onDelete={(id) => deleteNotification.mutate(id)}
            getTypeIcon={getTypeIcon}
            getCategoryColor={getCategoryColor}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function NotificationList({ notifications, onMarkRead, onDelete, getTypeIcon, getCategoryColor }) {
  if (notifications.length === 0) {
    return (
      <EmptyState
        icon={Bell}
        title="No notifications"
        description="You're all caught up!"
      />
    );
  }
  return (
    
    <div className="space-y-3">
      {notifications.map(notification => (
        <NotificationItem 
          key={notification.id}
          notification={notification}
          onMarkRead={onMarkRead}
          onDelete={onDelete}
          // No onAfterClick needed here since we don't have a drawer to close
        >
          {/* Everything that used to be inside <CardContent> goes here as children */}
          <Card
          className={`border-0 shadow-sm transition-all ${
            !notification.is_read ? 'bg-blue-50/50 hover:bg-blue-50' : 'hover:bg-slate-50'
          }`}
        >
          <CardContent className="p-4">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 mt-1">
              {getTypeIcon(notification.type)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className={`font-medium ${!notification.is_read ? 'text-slate-900' : 'text-slate-700'}`}>
                      {notification.title}
                    </h3>
                    {!notification.is_read && (
                      <span className="w-2 h-2 bg-blue-500 rounded-full" />
                    )}
                  </div>
                  <p className="text-sm text-slate-500 mt-1">{notification.message}</p>
                  <div className="flex items-center gap-3 mt-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${getCategoryColor(notification.category)}`}>
                      {notification.category}
                    </span>
                    <span className="text-xs text-slate-400">
                    {notification.created_at ? formatInTimeZone(new Date(notification.created_at),'UTC', 'MMM d, yyyy • h:mm a') :  '—' }
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {!notification.is_read && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => { e.stopPropagation(); onMarkRead(notification.id); }}
                      className="h-8 w-8 text-slate-400 hover:text-[#1e3a5f]"
                    >
                      <CheckCircle className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => { e.stopPropagation(); onDelete(notification.id); }}
                    className="h-8 w-8 text-slate-400 hover:text-rose-500"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              {/* Note: The 'View details' button is still useful for links, but now the whole card handles popup */}
              {notification.link && (
                  <Button
                    variant="link"
                    size="sm"
                    className="px-0 h-auto text-[#1e3a5f] mt-2"
                    asChild
                  >
                    <a href={notification.link}>View details →</a>
                  </Button>
                )}
            </div>
          </div>
          </CardContent>
          </Card>
        </NotificationItem>
      ))}
    </div>
  );

  // return (
  //   <div className="space-y-3">
  //     {notifications.map(notification => (
  //       <Card
  //         key={notification.id}
  //         className={`border-0 shadow-sm transition-all ${
  //           !notification.is_read ? 'bg-blue-50/50 hover:bg-blue-50' : 'hover:bg-slate-50'
  //         }`}
  //       >
  //         <CardContent className="p-4">
  //           <div className="flex items-start gap-4">
  //             <div className="flex-shrink-0 mt-1">
  //               {getTypeIcon(notification.type)}
  //             </div>
  //             <div className="flex-1 min-w-0">
  //               <div className="flex items-start justify-between gap-4">
  //                 <div>
  //                   <div className="flex items-center gap-2">
  //                     <h3 className={`font-medium ${!notification.is_read ? 'text-slate-900' : 'text-slate-700'}`}>
  //                       {notification.title}
  //                     </h3>
  //                     {!notification.is_read && (
  //                       <span className="w-2 h-2 bg-blue-500 rounded-full" />
  //                     )}
  //                   </div>
  //                   <p className="text-sm text-slate-500 mt-1">{notification.message}</p>
  //                   <div className="flex items-center gap-3 mt-2">
  //                     <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${getCategoryColor(notification.category)}`}>
  //                       {notification.category}
  //                     </span>
  //                     <span className="text-xs text-slate-400">
  //                     {notification.created_at ? formatInTimeZone(new Date(notification.created_at),'UTC', 'MMM d, yyyy • h:mm a') :  '—' }
  //                     </span>
  //                   </div>
  //                 </div>
  //                 <div className="flex items-center gap-1">
  //                   {!notification.is_read && (
  //                     <Button
  //                       variant="ghost"
  //                       size="icon"
  //                       onClick={() => onMarkRead(notification.id)}
  //                       className="h-8 w-8 text-slate-400 hover:text-[#1e3a5f]"
  //                     >
  //                       <CheckCircle className="h-4 w-4" />
  //                     </Button>
  //                   )}
  //                   <Button
  //                     variant="ghost"
  //                     size="icon"
  //                     onClick={() => onDelete(notification.id)}
  //                     className="h-8 w-8 text-slate-400 hover:text-rose-500"
  //                   >
  //                     <Trash2 className="h-4 w-4" />
  //                   </Button>
  //                 </div>
  //               </div>
  //               {notification.link && (
  //                 <Button
  //                   variant="link"
  //                   size="sm"
  //                   className="px-0 h-auto text-[#1e3a5f] mt-2"
  //                   asChild
  //                 >
  //                   <a href={notification.link}>View details →</a>
  //                 </Button>
  //               )}
  //             </div>
  //           </div>
  //         </CardContent>
  //       </Card>
  //     ))}
  //   </div>
  // );
}
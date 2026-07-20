import React, { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { api } from '@/api/apiClient';
import { useQueryClient } from '@tanstack/react-query';

export default function NotificationItem({ notification, icon, categoryStyle, children, onMarkRead, onDelete, onAfterClick }) {
  const [showDetail, setShowDetail] = useState(false);
  const queryClient = useQueryClient();

  const handleClick = async () => {
    // Mark as read if not already
    if (!notification.is_read) {
        await api.markRead(`${notification.id}`)
        queryClient.invalidateQueries({ queryKey: ['notif-panel']});
        queryClient.invalidateQueries({ queryKey: ['notifications']}); 
        queryClient.invalidateQueries({ queryKey: ['admin-notifications']});
    }
    if (onAfterClick) {
        onAfterClick();
      }
  

    if (notification.link) {
      window.location.href = notification.link;
    } else {
      setShowDetail(true);
    }
  };

  return (
    <>
      <Card 
        className={`cursor-pointer transition-all ${!notification.is_read ? 'bg-blue-50/50' : ''}`}
        onClick={handleClick}
      >
        <CardContent className="p-4">
          {/* Render your existing card content here, passing in icon and categoryStyle */}
          {children}
        </CardContent>
      </Card>

      <Dialog open={showDetail} onOpenChange={setShowDetail}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{notification.title}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-slate-600 leading-relaxed">{notification.message}</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDetail(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}


// {notifications.map(notification => (
//   <NotificationItem 
//     key={notification.id}
//     notification={notification}
//     onMarkRead={onMarkRead}
//     onDelete={onDelete}
//     // Pass visual props (icon, category style)
//   >
//     {/* Existing Card Content Logic */}
//   </NotificationItem>
// ))}

//onAfterClick={() => setNotifOpen(false)}



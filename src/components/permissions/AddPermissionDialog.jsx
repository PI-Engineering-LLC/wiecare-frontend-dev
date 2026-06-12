import {useState} from 'react';
import { api } from '@/api/apiClient';
import {  useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from 'sonner';

export default function AddPermissionDialog({ open, onClose, onSuccess }) {
    const [permissionData, setPermissionsData] = useState({ resource: '', action: '' });
    const createMutation = useMutation({
        mutationFn: (data) => api.createPermission(data), 
        onSuccess: () => {
          onSuccess();
          onClose(false);
          resetForm();
          toast.success('Permission created successfully');
        },
        onError: (error) => {
            console.error('Failed to create permission:', error);
            toast.error(`Failed to create permission: ${ error.message}`);
        }
    });

    const resetForm = () => {
        setPermissionsData({ resource: '', action: '' });
    }

    const handleAddPermission = async () => {
        if (!permissionData.resource || !permissionData.action) {
            toast.error('Resource and Action are required.');
            return;
        }
        await createMutation.mutateAsync(permissionData); 

    return (
        <Dialog open={open} onOpenChange={(open) => { if (!open) resetForm(); onClose(open); }  }>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Add New Permission</DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div>
                        <Label htmlFor="resource">Resource *</Label>
                        <Input
                            id="resource"
                            type="text"
                            placeholder="e.g., client, invoice, user"
                            value={permissionData.resource}
                            onChange={(e) => setPermissionsData({ ...permissionData, resource: e.target.value })}
                            className="mt-1"
                        />
                    </div>
                    <div>
                        <Label htmlFor="action">Action *</Label>
                        <Input
                            id="action"
                            type="text"
                            placeholder="e.g., view, create, edit, delete"
                            value={permissionData.action}
                            onChange={(e) => setPermissionsData({ ...permissionData, action: e.target.value })}
                            className="mt-1"
                        />
                        <p className="text-xs text-slate-500 mt-1">
                          Combines with resource to form `resource:action` (e.g., `client:view`, `user:edit`).
                        </p>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() =>{ resetForm(); onClose(false)}}>Cancel</Button>
                    <Button
                      onClick={handleAddPermission}
                      disabled={!permissionData.resource || !permissionData.action || createMutation.isPending}
                      className="bg-[#1e3a5f] hover:bg-[#2d5a8a]"
                    >
                       {createMutation.isPending ? 'Saving...' : 'Create Permission'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
  }
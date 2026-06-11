import {useState} from 'react';
import { api } from '@/api/apiClient';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from 'sonner';
import { Textarea } from "@/components/ui/textarea"; // Added Textarea for description
import { Switch } from "@/components/ui/switch"; // Added Switch for is_system

// `permissions` prop is now required from the parent component
export default function AddRoleDialog({ permissions, open, onClose, onSuccess }) {
    const [roleData, setRoleData] = useState({ name: '', description: '', is_system: false, selectedPermissionIds: [] });
    const queryClient = useQueryClient();

    const createMutation = useMutation({
        mutationFn: (data) => api.createRole(data), // api.createRole expects {name, permissionIds, description, is_system}
        onSuccess: () => {
            onSuccess();
            onClose(false);
            resetForm();
            toast.success('Role created successfully');
        },
        onError: (error) => {
            console.error('Failed to create role:', error);
            toast.error(`Failed to create role: ${error.response?.data?.error || error.message}`);
        }
    });

    const resetForm = () => {
        setRoleData({ name: '', description: '', is_system: false, selectedPermissionIds: [] });
    }

    const handleAddRole = async () => {
        if (!roleData.name) {
            toast.error('Role name is required.');
            return;
        }
        await createMutation.mutateAsync({
          name: roleData.name,
          description: roleData.description,
          is_system: roleData.is_system,
          permissionIds: roleData.selectedPermissionIds // Pass the array of selected permission IDs
        });
    };

    const togglePermission = (id) => {
        setRoleData(prevData => {
            const currentSelected = prevData.selectedPermissionIds;
            const newSelected = currentSelected.includes(id)
                ? currentSelected.filter(x => x !== id)
                : [...currentSelected, id];
            return { ...prevData, selectedPermissionIds: newSelected };
        });
    };

    return (
        <Dialog open={open} onOpenChange={(open) => { if (!open) resetForm(); onClose(open); }  }>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Add New Role</DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div>
                        <Label htmlFor="roleName">Role Name *</Label>
                        <Input
                            id="roleName"
                            type="text"
                            placeholder="e.g., client_admin"
                            value={roleData.name}
                            onChange={(e) => setRoleData({ ...roleData, name: e.target.value })}
                            className="mt-1"
                        />
                    </div>
                    <div>
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                          id="description"
                          placeholder="A brief description of this role"
                          value={roleData.description}
                          onChange={(e) => setRoleData({ ...roleData, description: e.target.value })}
                          className="mt-1"
                          rows={2}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="isSystem">System Role</Label>
                      <Switch
                        id="isSystem"
                        checked={roleData.is_system}
                        onCheckedChange={(v) => setRoleData({ ...roleData, is_system: v })}
                      />
                    </div>

                    <div>
                        <Label>Permissions</Label>
                        <div className="grid grid-cols-1 gap-2 mt-1 max-h-40 overflow-y-auto border p-2 rounded-md">
                          {permissions?.map(p => (
                              <div key={p.id} className="flex items-center space-x-2">
                                  <Input
                                      type="checkbox"
                                      id={`permission-${p.id}`}
                                      checked={roleData.selectedPermissionIds.includes(p.id)}
                                      onChange={() => togglePermission(p.id)}
                                      className="h-4 w-4"
                                  />
                                  <Label htmlFor={`permission-${p.id}`} className="font-normal text-sm">
                                    {`${p.resource}:${p.action}`} {/* Display resource:action */}
                                  </Label>
                              </div>
                          ))}
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => { resetForm(); onClose(false)}}>Cancel</Button>
                    <Button
                      onClick={handleAddRole}
                      disabled={!roleData.name || createMutation.isPending}
                      className="bg-[#1e3a5f] hover:bg-[#2d5a8a]"
                    >
                       {createMutation.isPending ? 'Saving...' : 'Create Role'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
  }
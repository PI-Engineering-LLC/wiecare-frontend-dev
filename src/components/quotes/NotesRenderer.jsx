import React from 'react';
import { MessageSquare } from 'lucide-react';

export default function NotesSection({ notes = "" }) {
  // 1. Regular expression with capturing groups to catch every single bracket header
  const regex = /(\[(?:Admin note|Client Modification Request)[^\]]*\]:)/g;
  const parts = notes.split(regex);

  const adminBlocks = [];
  const clientBlocks = [];

  // 2. Iterate through the array. parts[i] is the tag with timestamp, parts[i+1] is the text content
  for (let i = 1; i < parts.length; i += 2) {
    const header = parts[i].trim();
    const content = parts[i + 1] ? parts[i + 1].trim() : "";

    if (!content) continue;

    // Combine them into a clean single string entry
    const entry = `${header}\n${content}`;

    // Sort into their absolute containers based on string content
    if (header.includes("Client Modification Request")) {
      clientBlocks.push(entry);
    } else if (header.includes("Admin note")) {
      adminBlocks.push(entry);
    }
  }

  // 3. Stringify the grouped entries with a clean separation gap
  const combinedClientNotes = clientBlocks.join("\n\n");
  const combinedAdminNotes = adminBlocks.join("\n\n");

  return (
    <div className="space-y-3 pt-4 border-t">
      {/* Yellow Box: Client Modification Requests Only */}
      {combinedClientNotes && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
          <p className="text-xs font-semibold text-amber-700 mb-2 flex items-center gap-1.5">
            <MessageSquare className="h-3.5 w-3.5" /> Client Modification Request
          </p>
          <p className="text-sm text-amber-800 whitespace-pre-line">
            {combinedClientNotes}
          </p>
        </div>
      )}

      {/* Blue Box: Admin Notes History Only */}
      {combinedAdminNotes && (
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
          <p className="text-xs font-semibold text-slate-600 mb-2">
            Admin Notes History
          </p>
          <p className="text-sm text-slate-700 whitespace-pre-line">
            {combinedAdminNotes}
          </p>
        </div>
      )}
    </div>
  );
}

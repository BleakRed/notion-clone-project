import prisma from '../prisma';
import { supabase, supabaseBucket } from '../supabase';

// Helper to extract path from Supabase URL
const getFilePathFromUrl = (url: string) => {
  // Public URL format: https://[project].supabase.co/storage/v1/object/public/[bucket]/[path]
  const parts = url.split(`/storage/v1/object/public/${supabaseBucket}/`);
  return parts.length > 1 ? parts[1] : null;
};

export const cleanupUnverifiedUsers = async () => {
    console.log('[Cleanup] Starting unverified users cleanup...');
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

    try {
        // Find users not verified for more than a month
        const unverifiedUsers = await prisma.user.findMany({
            where: {
                isVerified: false,
                createdAt: { lt: oneMonthAgo }
            },
            include: {
                ownedWorkspaces: {
                    include: {
                        files: true
                    }
                }
            }
        });

        console.log(`[Cleanup] Found ${unverifiedUsers.length} unverified accounts to delete.`);

        for (const user of unverifiedUsers) {
            // Collect all file paths from workspaces owned by this user
            // Because of onDelete: Cascade, the records will be gone, but we need to delete physical files
            const filesToDelete: string[] = [];
            for (const workspace of user.ownedWorkspaces) {
                for (const file of workspace.files) {
                    const filePath = getFilePathFromUrl(file.url);
                    if (filePath) filesToDelete.push(filePath);
                }
            }

            if (filesToDelete.length > 0) {
                const { error } = await supabase.storage
                    .from(supabaseBucket)
                    .remove(filesToDelete);
                
                if (error) {
                    console.error(`[Cleanup] Error deleting files for user ${user.id}:`, error);
                } else {
                    console.log(`[Cleanup] Deleted ${filesToDelete.length} files from storage.`);
                }
            }

            // Delete the user (cascades to Workspace, Page, File records, etc.)
            await prisma.user.delete({ where: { id: user.id } });
            console.log(`[Cleanup] Deleted user: ${user.email}`);
        }

    } catch (error) {
        console.error('[Cleanup] Error during unverified users cleanup:', error);
    }
};

export const cleanupOrphanedWorkspaces = async () => {
    console.log('[Cleanup] Starting orphaned workspaces cleanup...');
    try {
        // Find workspaces with no members
        const orphanedWorkspaces = await prisma.workspace.findMany({
            where: {
                members: {
                    none: {}
                }
            },
            include: {
                files: true
            }
        });

        console.log(`[Cleanup] Found ${orphanedWorkspaces.length} orphaned workspaces to delete.`);

        for (const workspace of orphanedWorkspaces) {
            const filesToDelete: string[] = [];
            for (const file of workspace.files) {
                const filePath = getFilePathFromUrl(file.url);
                if (filePath) filesToDelete.push(filePath);
            }

            if (filesToDelete.length > 0) {
                const { error } = await supabase.storage
                    .from(supabaseBucket)
                    .remove(filesToDelete);
                
                if (error) {
                    console.error(`[Cleanup] Error deleting files for workspace ${workspace.id}:`, error);
                } else {
                    console.log(`[Cleanup] Deleted ${filesToDelete.length} files from storage.`);
                }
            }
            await prisma.workspace.delete({ where: { id: workspace.id } });
            console.log(`[Cleanup] Deleted workspace: ${workspace.name}`);
        }
    } catch (error) {
        console.error('[Cleanup] Error during orphaned workspaces cleanup:', error);
    }
};

export const runFullCleanup = async () => {
    await cleanupUnverifiedUsers();
    await cleanupOrphanedWorkspaces();
};

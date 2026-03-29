import prisma from '../prisma';
import fs from 'fs';
import path from 'path';

const UPLOADS_DIR = path.join(process.cwd(), 'uploads');

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
            for (const workspace of user.ownedWorkspaces) {
                for (const file of workspace.files) {
                    const filePath = path.join(UPLOADS_DIR, path.basename(file.url));
                    if (fs.existsSync(filePath)) {
                        fs.unlinkSync(filePath);
                        console.log(`[Cleanup] Deleted physical file: ${filePath}`);
                    }
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
            for (const file of workspace.files) {
                const filePath = path.join(UPLOADS_DIR, path.basename(file.url));
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                    console.log(`[Cleanup] Deleted physical file: ${filePath}`);
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

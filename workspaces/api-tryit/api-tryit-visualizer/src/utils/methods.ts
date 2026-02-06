export function getMethodBgColor(method: string): string {
    const methods: Record<string, string> = {
        GET: '#3498DB',
        POST: '#2ECC71',
        PUT: '#F39C12',
        DELETE: '#E74C3C',
        PATCH: '#9B59B6',
        HEAD: '#95A5A6',
        OPTIONS: '#1ABC9C'
    };

    return methods[method?.toUpperCase?.()] || '#95A5A6';
}

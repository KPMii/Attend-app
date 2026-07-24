export const PAGE_SIZE = 20;

export function getRange(page: number, pageSize: number, number = PAGE_SIZE){
    const from = page * pageSize;
    const to = from + pageSize - 1
    return {from, to};
}
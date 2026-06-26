// Dữ liệu thật lô DCB02 (số thửa 5-54-55): 27 ô, 2.943 m².
//   1 ô có sổ · 16 ô chưa sổ (đã bán) · 10 ô chưa bán.
// Nguồn: DCB02.xlsx. Mã ô dùng dạng KHÔNG dấu chấm (DCB02-n).
// File này chỉ chứa DỮ LIỆU NGHIỆP VỤ theo ô; hình học (grid) dựng ở cells.js.
//
// Trạng thái (business):
//   sold_red_book  = đã có sổ        (ô 7)
//   sold_no_book   = chưa sổ, đã bán (ô 1-6, 8-16, 27)
//   unsold         = chưa bán        (ô 17-26)
export const DCB02_RAW = [
  {
    o: 1, cellCode: 'DCB02-1', area: 87, business: 'sold_no_book',
    contractCode: '17/10', signDate: '2010-02-03', customer: 'Phạm Mạnh Cường',
    address: 'TP Hải Dương', totalValue: 750000000,
    payments: [{ date: '2021-12-31', amount: 750000000, note: 'Thanh toán đến 2021' }],
    remaining: 0, taxBearer: 'Bên B', payment: 'paid_full',
  },
  {
    o: 2, cellCode: 'DCB02-2', area: 90, business: 'sold_no_book',
    contractCode: '17/10', signDate: '2010-02-03', customer: 'Phạm Mạnh Cường',
    address: 'TP Hải Dương', totalValue: 750000000,
    payments: [{ date: '2021-12-31', amount: 750000000, note: 'Thanh toán đến 2021' }],
    remaining: 0, taxBearer: 'Bên B', payment: 'paid_full',
  },
  {
    o: 3, cellCode: 'DCB02-3', area: 90, business: 'sold_no_book',
    contractCode: '2/18', signDate: '2018-01-03', customer: 'Vũ Đỡnh Hựng',
    address: 'Sao Đỏ, CL, HD', totalValue: 1100000000,
    payments: [{ date: '2021-12-31', amount: 1100000000, note: 'Thanh toán đến 2021' }],
    remaining: 0, taxBearer: 'Bên A', payment: 'paid_full',
  },
  {
    o: 4, cellCode: 'DCB02-4', area: 90, business: 'sold_no_book',
    contractCode: '12/15', signDate: '2015-06-05', customer: 'Vũ Đỡnh Hựng',
    address: 'Sao Đỏ, CL, HD', totalValue: 630000000,
    payments: [{ date: '2021-12-31', amount: 600000000, note: 'Thanh toán đến 2021' }],
    remaining: 30000000, taxBearer: 'Bên A', payment: 'partial',
  },
  {
    o: 5, cellCode: 'DCB02-5', area: 90, business: 'sold_no_book',
    contractCode: '12/15', signDate: '2015-06-05', customer: 'Vũ Đỡnh Hựng',
    address: 'Sao Đỏ, CL, HD', totalValue: 630000000,
    payments: [{ date: '2021-12-31', amount: 600000000, note: 'Thanh toán đến 2021' }],
    remaining: 30000000, taxBearer: 'Bên A', payment: 'partial',
  },
  {
    o: 6, cellCode: 'DCB02-6', area: 90, business: 'sold_no_book',
    contractCode: '12/15', signDate: '2015-06-05', customer: 'Vũ Đỡnh Hựng',
    address: 'Sao Đỏ, CL, HD', totalValue: 630000000,
    payments: [{ date: '2021-12-31', amount: 600000000, note: 'Thanh toán đến 2021' }],
    remaining: 30000000, taxBearer: 'Bên A', payment: 'partial',
  },
  {
    o: 7, cellCode: 'DCB02-7', area: 87, business: 'sold_red_book',
    contractCode: '12/10', signDate: '2010-10-02', customer: 'Phạm Khắc Tráng',
    address: 'Hưng Đạo, CL, HD', totalValue: 957000000,
    payments: [{ date: '2021-12-31', amount: 957000000, note: 'Thanh toán đến 2021' }],
    remaining: 0, taxBearer: null, payment: 'paid_full',
  },
  {
    o: 8, cellCode: 'DCB02-8', area: 80, business: 'sold_no_book',
    contractCode: '1/18', signDate: '2018-01-03', customer: 'Vũ Đỡnh Hựng',
    address: 'Sao Đỏ, CL, HD', totalValue: 550000000,
    payments: [{ date: '2021-12-31', amount: 550000000, note: 'Thanh toán đến 2021' }],
    remaining: 0, taxBearer: 'Bên A', payment: 'paid_full',
  },
  {
    o: 9, cellCode: 'DCB02-9', area: 80, business: 'sold_no_book',
    contractCode: '3/19', signDate: '2019-01-21', customer: 'Hưng Tỏm B02 6 lụ vay chưa rừ',
    address: null, totalValue: 333333333,
    payments: [{ date: '2021-12-31', amount: 333333333, note: 'Thanh toán đến 2021' }],
    remaining: 0, taxBearer: 'Bên A', payment: 'paid_full',
  },
  {
    o: 10, cellCode: 'DCB02-10', area: 80, business: 'sold_no_book',
    contractCode: '3/19', signDate: '2019-01-21', customer: 'Hưng Tỏm B02 6 lụ vay chưa rừ',
    address: null, totalValue: 333333333,
    payments: [{ date: '2021-12-31', amount: 333333333, note: 'Thanh toán đến 2021' }],
    remaining: 0, taxBearer: 'Bên A', payment: 'paid_full',
  },
  {
    o: 11, cellCode: 'DCB02-11', area: 80, business: 'sold_no_book',
    contractCode: '3/19', signDate: '2019-01-21', customer: 'Hưng Tỏm B02 6 lụ vay chưa rừ',
    address: null, totalValue: 333333333,
    payments: [{ date: '2021-12-31', amount: 333333333, note: 'Thanh toán đến 2021' }],
    remaining: 0, taxBearer: 'Bên A', payment: 'paid_full',
  },
  {
    o: 12, cellCode: 'DCB02-12', area: 80, business: 'sold_no_book',
    contractCode: '18/15', signDate: '2015-07-21', customer: 'Vũ Đỡnh Hựng',
    address: null, totalValue: 560000000,
    payments: [{ date: '2021-12-31', amount: 444800000, note: 'Thanh toán đến 2021' }],
    remaining: 115200000, taxBearer: 'Bên A', payment: 'partial',
  },
  {
    o: 13, cellCode: 'DCB02-13', area: 80, business: 'sold_no_book',
    contractCode: '3/19', signDate: '2019-01-21', customer: 'Hưng Tỏm B02 6 lụ vay chưa rừ',
    address: null, totalValue: 333333333,
    payments: [{ date: '2021-12-31', amount: 333333333, note: 'Thanh toán đến 2021' }],
    remaining: 0, taxBearer: 'Bên A', payment: 'paid_full',
  },
  {
    o: 14, cellCode: 'DCB02-14', area: 80, business: 'sold_no_book',
    contractCode: '3/19', signDate: '2019-01-21', customer: 'Hưng Tỏm B02 6 lụ vay chưa rừ',
    address: null, totalValue: 333333333,
    payments: [{ date: '2021-12-31', amount: 333333333, note: 'Thanh toán đến 2021' }],
    remaining: 0, taxBearer: 'Bên A', payment: 'paid_full',
  },
  {
    o: 15, cellCode: 'DCB02-15', area: 80, business: 'sold_no_book',
    contractCode: '3/19', signDate: '2019-01-21', customer: 'Hưng Tỏm B02 6 lụ vay chưa rừ',
    address: null, totalValue: 333333333,
    payments: [{ date: '2021-12-31', amount: 333333333, note: 'Thanh toán đến 2021' }],
    remaining: 0, taxBearer: 'Bên A', payment: 'paid_full',
  },
  {
    o: 16, cellCode: 'DCB02-16', area: 150, business: 'sold_no_book',
    contractCode: '20/15', signDate: '2015-08-14', customer: 'Nguyễn Văn Chỳc',
    address: 'Sao Đỏ, CL, HD', totalValue: 675000000,
    payments: [{ date: '2021-12-31', amount: 337500000, note: 'Thanh toán đến 2021' }],
    remaining: 337500000, taxBearer: 'Bên A', payment: 'partial',
  },
  { o: 17, cellCode: 'DCB02-17', area: 150, business: 'unsold' },
  { o: 18, cellCode: 'DCB02-18', area: 150, business: 'unsold' },
  { o: 19, cellCode: 'DCB02-19', area: 150, business: 'unsold' },
  { o: 20, cellCode: 'DCB02-20', area: 115.75, business: 'unsold' },
  { o: 21, cellCode: 'DCB02-21', area: 123.75, business: 'unsold' },
  { o: 22, cellCode: 'DCB02-22', area: 123.75, business: 'unsold' },
  { o: 23, cellCode: 'DCB02-23', area: 115.75, business: 'unsold' },
  { o: 24, cellCode: 'DCB02-24', area: 150, business: 'unsold' },
  { o: 25, cellCode: 'DCB02-25', area: 150, business: 'unsold' },
  { o: 26, cellCode: 'DCB02-26', area: 150, business: 'unsold' },
  {
    o: 27, cellCode: 'DCB02-27', area: 150, business: 'sold_no_book',
    contractCode: '20/11', signDate: '2011-04-27', customer: 'Nguyễn Văn Diệm',
    address: null, totalValue: 300000000,
    payments: [{ date: '2021-12-31', amount: 300000000, note: 'Thanh toán đến 2021' }],
    remaining: 0, taxBearer: 'Bên B', payment: 'paid_full',
  },
];

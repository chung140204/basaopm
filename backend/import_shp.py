# -*- coding: utf-8 -*-
"""Import shapefile ranh thửa vào bảng ranh_thua (chạy 1 lần khi khởi tạo DB).

File gốc đã thất lạc; đây là placeholder để Dockerfile COPY không lỗi build.
Dữ liệu ranh_thua đã được import sẵn trong DB (volume pgdata) nên script này
không cần chạy lại. Nếu cần re-import shapefile, khôi phục nội dung gốc.
"""

if __name__ == "__main__":
    print("import_shp.py: placeholder — ranh_thua đã có sẵn trong DB, bỏ qua.")

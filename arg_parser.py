import math
import random
import numpy as np
from copy import deepcopy
from itertools import cycle, islice
from mturk.MturkHandler import MturkHandler
from shapes.shape_update import ShapeUpdate


def shuffle_list_of_lists(list_of_lists):
    list_of_lists_copy = deepcopy(list_of_lists)
    for lst in list_of_lists_copy:
        random.shuffle(lst)
    return list_of_lists_copy


def calculate_new_list_size(max_list_size, num_of_lists, bucket_size):
    amount_of_items = max_list_size * num_of_lists
    if amount_of_items % bucket_size == 0:
        return max_list_size

    delta_list_size = math.ceil(bucket_size / num_of_lists)
    new_list_size = max_list_size + delta_list_size
    return new_list_size


def expand_list_size(lst, new_size):
    if len(lst) == new_size:
        return lst
    return list(islice(cycle(lst), new_size))


def flat_2_dim_list_by_columns(list_of_lists):
    flat_list = np.array(list_of_lists).flatten('F').tolist()
    return flat_list


def split_list_into_buckets(lst, bucket_size, num_of_buckets):
    arr = np.array(lst)
    arr.resize(num_of_buckets * bucket_size)
    buckets = arr.reshape((num_of_buckets, bucket_size))
    return buckets.tolist()


def create_buckets(list_of_lists, bucket_size):
    num_of_lists = len(list_of_lists)
    max_list_size = len(max(list_of_lists, key=len))
    new_list_size = calculate_new_list_size(max_list_size, num_of_lists, bucket_size=bucket_size)
    num_of_buckets = (new_list_size * num_of_lists) // bucket_size

    list_of_lists = shuffle_list_of_lists(list_of_lists)

    list_of_lists = [expand_list_size(lst, new_list_size) for lst in list_of_lists]
    slides_list = flat_2_dim_list_by_columns(list_of_lists)
    slides_buckets = split_list_into_buckets(slides_list, bucket_size, num_of_buckets)
    return slides_buckets


def parse_subccmd(sub_cmd, arguments):
    if sub_cmd == 'update':
        parse_update(arguments)
    elif sub_cmd == 'mturk':
        parse_mturk(arguments)


def parse_update(args):
    file_path = args['file_path']
    output = args['output']
    slide_nums = args['slide_num']
    shape_update = ShapeUpdate(file_path, output)
    if slide_nums:
        for number in slide_nums:
            shape_update.update_svg_by_num(number)
    else:
        shape_update.update_svg()


def parse_mturk(args):
    sub_turk_cmd = args['mturkcmd']

    if sub_turk_cmd == 'read':
        mturk_read()
    elif sub_turk_cmd == 'write':
        title = args['title']
        slides_lst = args['choose']

        if slides_lst is not None:
            mturk_write(title, slides_lst)
        else:
            list_of_lists = [list(range(2, 41)), list(range(41, 131)), list(range(131, 163))]
            slides_buckets = create_buckets(list_of_lists=list_of_lists, bucket_size=5)
            for bucket in slides_buckets:
                mturk_write(title, bucket)


def mturk_read():
    mturk_handler = MturkHandler()
    mturk_handler.read_hits()


def mturk_write(title, slides_lst):
    mturk_handler = MturkHandler()
    mturk_handler.create_hit(title, slides_lst)
